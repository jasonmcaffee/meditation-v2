import IMeditationSession from "../models/IMeditationSession";
import fileSystem, {baseDirectory} from "../services/fileSystem";
import IDataContainer from "../models/DataContainer";
import appEventBus from "../services/appEventBus";

const sessionsDataFilePath = baseDirectory + '/sessions.txt';


export class MeditationSessionRepository {
    dataContainer?: IDataContainer;
    async getMeditationSessions(startDateMs?: number, limit?: number): Promise<IMeditationSession[]>{
        const dataContainer = await this.getDataContainer();
        const meditationSessions = dataContainer.meditationSessions;
        if(startDateMs == undefined) { return meditationSessions; }

        let result = meditationSessions.filter(m => m.dateMs >= startDateMs);
        return result.slice(0, limit);
    }

    async getDataContainer(forceRefresh = false){
        if(forceRefresh == false && this.dataContainer != undefined){ return this.dataContainer; }
        const startTime = Date.now();
        let dataString = await ensureSessionsFileExists(async ()=>{
            return await fileSystem.readFile(sessionsDataFilePath);
        });
        const dataContainer = convertDataStringToDataContainer(dataString);
        const duration = Date.now() - startTime;
        this.dataContainer = dataContainer;
        console.log(`it took ${duration} ms to retrieve date from file system. count: ${dataContainer.meditationSessions.length}`);
        return dataContainer;
    }

    async deleteAll(){
        await this.saveDataContainer({meditationSessions: []});
    }

    async saveMeditationSession(meditationSession: IMeditationSession){
        const dataContainer = await this.getDataContainer();
        dataContainer.meditationSessions.unshift(meditationSession); //insert at beginning;
        await this.saveDataContainer(dataContainer);
        appEventBus.meditationSessionRepository.meditationSessionsChanged().set(dataContainer.meditationSessions);
    }

    async deleteMeditationSession(meditationSession: IMeditationSession){
        const dataContainer = await this.getDataContainer();
        //should be upsert.
        const index = dataContainer.meditationSessions.findIndex( s => s.id == meditationSession.id);
        if(index < 0){ return console.log(`no meditation session exists.`) }
        dataContainer.meditationSessions.splice(index, 1);
        await this.saveDataContainer(dataContainer);
        appEventBus.meditationSessionRepository.meditationSessionsChanged().set(dataContainer.meditationSessions);
    }

    async saveDataContainer(dataContainer: IDataContainer){
        this.dataContainer = dataContainer;
        const dataContainerString = JSON.stringify(dataContainer);
        await fileSystem.writeFile(dataContainerString, sessionsDataFilePath);
    }
}

async function ensureSessionsFileExists(func: ()=> Promise<string> ){
    try{
        return await func();
    }catch(e){
        //@ts-ignore
        if(e.message.indexOf('no such file or directory') >= 0){
            console.log(`file doesn't exist.`)
            const dataContainer: IDataContainer = {
                meditationSessions: [],
            }
            const dataString = JSON.stringify(dataContainer);
            await fileSystem.writeFile(dataString, sessionsDataFilePath);
            return dataString;
        }else{
            throw e;
        }
    }
}


function convertDataStringToDataContainer(dataString: string): IDataContainer{
    const dataContainer = JSON.parse(dataString) as IDataContainer;
    return dataContainer;
}

function convertDataStringToMeditationSession(dataString: string): IMeditationSession{
    const meditationSession = JSON.parse(dataString) as IMeditationSession;
    return meditationSession;
}
const meditationSessionRepository = new MeditationSessionRepository();
export default meditationSessionRepository;