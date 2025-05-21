import fileSystem, {baseDirectory} from "../services/fileSystem";
import IUserPreferences from "../models/IUserPreferences";

const userPreferencesDataFilePath = baseDirectory + '/sessions.txt';

class UserPreferencesRepository{
    async getUserPreferences(): Promise<IUserPreferences>{
        const json = await fileSystem.readFile(userPreferencesDataFilePath);
        const userPreferences = convertJsonToUserPreferences(json);
        return userPreferences;
    }

    async saveUserPreferences(userPreferences:IUserPreferences){
        await fileSystem.writeFile(convertUserPreferencesToJson(userPreferences), userPreferencesDataFilePath)
    }
}

function convertUserPreferencesToJson(userPreferences: IUserPreferences){
    return JSON.stringify(userPreferences);
}

function convertJsonToUserPreferences(json: string){
    const jsonObject = JSON.parse(json) as IUserPreferences;
    return jsonObject;
}

const userPreferencesRepository = new UserPreferencesRepository();
export default userPreferencesRepository;