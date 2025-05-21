import IMeditationSession from "../models/IMeditationSession";
import meditationSessionRepository, {MeditationSessionRepository} from "../repository/meditationSessionRepository";
import {useState} from "react";



class MeditationSession{

    async getMeditationSessions() : Promise<IMeditationSession[]>{
        return meditationSessionRepository.getMeditationSessions();
    }

    async deleteMeditationSession(meditationSession: IMeditationSession){
        return meditationSessionRepository.deleteMeditationSession(meditationSession);
    }
}

const meditationSession = new MeditationSession();
export default meditationSession;

// ended up not being needed yet.
// class Paginator{
//     repo: MeditationSessionRepository;
//     limit = 10;
//     constructor(repo: MeditationSessionRepository) {
//         this.repo = repo;
//     }
//     nextPageStartMs?:number = undefined
//     async getNextPage(){
//         const result = await this.repo.getMeditationSessions(this.nextPageStartMs, this.limit);
//         const lastEntry = result[result.length - 1];
//         this.nextPageStartMs = lastEntry? lastEntry.dateMs + 1 : undefined;
//         console.log(`got back: ${result.length} items.  nextPageStartMs is: ${this.nextPageStartMs}`);
//         return result;
//     }
//
//     async getFirstPage(){
//         this.nextPageStartMs = undefined;
//         return this.getNextPage();
//     }
// }


// /**
//  * Save new or update existing.
//  * @param meditationSession
//  */
// async saveMeditationSession(meditationSession: IMeditationSession){
//     return meditationSessionRepository.saveMeditationSession(meditationSession);
// }
//
// async createAndSaveMeditationSession(durationMs: number, notes: string, dateMs = Date.now()){
//     const session: IMeditationSession = {
//         id: Date.now().toString(),
//         durationMs,
//         notes,
//         dateMs,
//     };
//     await this.saveMeditationSession(session);
//     return session;
// }