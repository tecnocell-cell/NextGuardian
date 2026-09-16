import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { LocationRepository, type SampleRow } from './location.repository.js';
import { deriveTransition, isInside, type Transition } from './geofence.js';
import type { CreateGeofenceInput, ReportLocationsInput, UpdateGeofenceInput } from './location.dto.js';
import { EventsService } from '../events/events.service.js';
import { geofenceView, locationSampleView } from '../../shared/http/serializers.js';
import { serverTime } from '../../shared/http/validation.js';
import { DAY, MINUTE } from '../../shared/time/durations.js';
import type { Principal } from '../../shared/auth/principal.js';

const HISTORY_LIMIT = 200;

@Injectable()
export class LocationService {
  constructor(private readonly repo: LocationRepository, private readonly events: EventsService) {}

  // Agent ingest. Samples are batched because the agent queues them while offline.
  async report(principal: Principal, input: ReportLocationsInput) {
    if (!principal.deviceId) throw new NotFoundException('Device session required');
    const { workspaceId, deviceId } = { workspaceId: principal.workspaceId, deviceId: principal.deviceId };

    const device = await this.repo.getDevice(deviceId);
    if (!device || device.workspaceId !== workspaceId) throw new NotFoundException('Device not found in workspace');
    if (device.pairingState !== 'PAIRED') throw new ConflictException('Device is not paired');

    const now = new Date();
    const rows: SampleRow[] = input.samples.map(sample => ({
      workspaceId,
      deviceId,
      latitude: sample.latitude,
      longitude: sample.longitude,
      accuracyMeters: sample.accuracyMeters,
      source: sample.source,
      observedAt: new Date(sample.observedAt),
      consentVersion: sample.consentVersion,
    }));
    await this.repo.createSamples(rows);

    // Geofences are evaluated against the freshest sample only: intermediate
    // points in a flushed offline batch would replay stale crossings as if live.
    const newest = rows.reduce((a, b) => (a.observedAt >= b.observedAt ? a : b));
    const transitions = await this.evaluateGeofences(workspaceId, deviceId, newest, now);

    const policy = await this.repo.policy(workspaceId);
    await this.repo.prune(workspaceId, deviceId, new Date(now.getTime() - policy.locationRetentionDays * DAY));

    return { accepted: rows.length, transitions, serverTime: serverTime() };
  }

  private async evaluateGeofences(workspaceId: string, deviceId: string, sample: SampleRow, now: Date) {
    const [geofences, states] = await Promise.all([
      this.repo.activeGeofences(workspaceId),
      this.repo.geofenceStates(workspaceId, deviceId),
    ]);
    const byGeofence = new Map(states.map(state => [state.geofenceId, state]));
    const fired: { geofenceId: string; name: string; transition: Transition }[] = [];

    for (const geofence of geofences) {
      const inside = isInside(
        { latitude: geofence.centerLatitude, longitude: geofence.centerLongitude, radiusMeters: geofence.radiusMeters },
        sample,
      );
      const previous = byGeofence.get(geofence.geofenceId) ?? null;
      const decision = deriveTransition(previous, inside, now, {
        dwellMinutes: geofence.dwellMinutes,
        subscribed: geofence.transitions,
      });

      await this.repo.upsertGeofenceState({
        geofenceId: geofence.geofenceId, deviceId, workspaceId, ...decision.state,
      });

      if (decision.transition) {
        fired.push({ geofenceId: geofence.geofenceId, name: geofence.name, transition: decision.transition });
        // Payload carries the geofence, never the raw coordinates (doc 14).
        await this.events.record({
          workspaceId, deviceId, category: 'LOCATION', type: 'GEOFENCE_EVENT', severity: 'NOTICE', source: 'AGENT',
          payload: { geofenceId: geofence.geofenceId, name: geofence.name, transition: decision.transition },
        });
      }
    }
    return fired;
  }

  // Console history. Staleness is derived here, never stored (doc 16 §1).
  async history(principal: Principal, deviceId: string) {
    const device = await this.repo.getDevice(deviceId);
    if (!device || device.workspaceId !== principal.workspaceId) throw new NotFoundException('Device not found in workspace');

    const [policy, samples] = await Promise.all([
      this.repo.policy(principal.workspaceId),
      this.repo.listSamples(principal.workspaceId, deviceId, HISTORY_LIMIT),
    ]);
    const latest = samples[0] ?? null;
    const stale = latest === null || Date.now() - latest.serverReceivedAt.getTime() > policy.locationStaleMinutes * MINUTE;

    return {
      latest: latest ? locationSampleView(latest) : null,
      stale,
      retentionDays: policy.locationRetentionDays,
      samples: samples.map(locationSampleView),
      serverTime: serverTime(),
    };
  }

  async listGeofences(principal: Principal) {
    const geofences = await this.repo.listGeofences(principal.workspaceId);
    return { geofences: geofences.map(geofenceView), serverTime: serverTime() };
  }

  async createGeofence(principal: Principal, input: CreateGeofenceInput) {
    const geofence = await this.repo.createGeofence({ workspaceId: principal.workspaceId, ...input });
    await this.events.record({
      workspaceId: principal.workspaceId, category: 'LOCATION', type: 'GEOFENCE_CREATED', source: 'ADMIN',
      payload: { geofenceId: geofence.geofenceId, name: geofence.name },
    });
    return geofenceView(geofence);
  }

  async updateGeofence(principal: Principal, geofenceId: string, input: UpdateGeofenceInput) {
    await this.ownedGeofence(principal, geofenceId);
    return geofenceView(await this.repo.updateGeofence(geofenceId, input));
  }

  async deleteGeofence(principal: Principal, geofenceId: string) {
    const geofence = await this.ownedGeofence(principal, geofenceId);
    await this.repo.deleteGeofence(geofenceId);
    await this.events.record({
      workspaceId: principal.workspaceId, category: 'LOCATION', type: 'GEOFENCE_DELETED', source: 'ADMIN',
      payload: { geofenceId, name: geofence.name },
    });
  }

  private async ownedGeofence(principal: Principal, geofenceId: string) {
    const geofence = await this.repo.getGeofence(geofenceId);
    if (!geofence || geofence.workspaceId !== principal.workspaceId) throw new NotFoundException('Geofence not found in workspace');
    return geofence;
  }
}
