import IMeditationSession from "../models/IMeditationSession";
import {SessionStore} from "./inillucentSessionRepository";
import {ActiveStorage, bootstrapStorage} from "../services/storage/storageBootstrap";
import appEventBus from "../services/appEventBus";

/**
 * The sessions store the rest of the app uses. It has the same methods it had when it read the JSON
 * file directly; each call waits for the storage bootstrap and then goes to whichever store the
 * bootstrap chose (the inillucent database, or the JSON file).
 */
export class MeditationSessionRepository implements SessionStore{
    private active?: Promise<ActiveStorage>;

    /** Starts the bootstrap once; later calls share it. */
    start(): Promise<ActiveStorage>{
        if(!this.active){
            this.active = bootstrapStorage();
            this.active.catch(e => console.error('[storage] bootstrap failed', e));
        }
        return this.active;
    }

    /**
     * Closes the current storage and runs the bootstrap again, then announces the new list. The Data
     * screen uses this after it changes the storage choice or asks for the conversion again.
     */
    async restart(): Promise<ActiveStorage>{
        const previous = this.active;
        this.active = undefined;
        const old = await previous?.catch(() => undefined);
        await old?.db?.close().catch(e => console.warn('[storage] close failed', e));
        const next = await this.start();
        appEventBus.meditationSessionRepository.meditationSessionsChanged().set(await next.store.getMeditationSessions());
        return next;
    }

    /**
     * Sessions newest first; with startDateMs, only those at or after it, up to limit.
     * @param startDateMs - the earliest start time to include
     * @param limit - how many to return
     */
    async getMeditationSessions(startDateMs?: number, limit?: number): Promise<IMeditationSession[]>{
        return (await this.start()).store.getMeditationSessions(startDateMs, limit);
    }

    /**
     * Saves a session at the top of the list.
     * @param meditationSession - the session
     */
    async saveMeditationSession(meditationSession: IMeditationSession){
        await (await this.start()).store.saveMeditationSession(meditationSession);
    }

    /**
     * Deletes a session and its media files.
     * @param meditationSession - the session
     */
    async deleteMeditationSession(meditationSession: IMeditationSession){
        await (await this.start()).store.deleteMeditationSession(meditationSession);
    }

    /** Deletes every session. */
    async deleteAll(){
        await (await this.start()).store.deleteAll();
    }
}

const meditationSessionRepository = new MeditationSessionRepository();
export default meditationSessionRepository;
