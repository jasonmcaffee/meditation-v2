const RNFS = require('react-native-fs');
export const baseDirectory = RNFS.DocumentDirectoryPath;

class FileSystem{

    async writeFile(data: string, path: string) {
        await this.mkDir(baseDirectory);
        // const path = RNFS.DocumentDirectoryPath + '/test.txt';
        const start = Date.now();
        console.log(`writing file. path: ${path}`);
        const result = RNFS.writeFile(path, data, 'utf8');
        const duration = Date.now() - start;
        console.log(`writing took: ${duration} ms`);
        return result;
    }

    async mkDir(path: string){
        return RNFS.mkdir(path);
    }

    async readFile(path: string){
        // const path = RNFS.DocumentDirectoryPath + '/test.txt';
        const start = Date.now();
        console.log(`reading file: ${path}`);
        const result = await RNFS.readFile(path, 'utf8');
        const stat = await RNFS.stat(path);

        const duration = Date.now() - start;
        console.log(`reading took: ${duration} ms size: ${stat.size}`);
        // console.log(`read file: `, result);
        return result;
    }
}

const fileSystem = new FileSystem();
export default fileSystem;

// const testData = {
//     date: Date.now(),
//     duration: 123456,
//     description: 'some notes about the session',
// }
// const testDataString = JSON.stringify(testData);
// console.log(`test data: ${testDataString}`);
// const deserialized = JSON.parse(testDataString);
// console.log(`deserialized: ${deserialized.duration}`, deserialized);



// require the module
// var RNFS = require('react-native-fs');
//
// // get a list of files and directories in the main bundle
// RNFS.readDir(RNFS.MainBundlePath) // On Android, use "RNFS.DocumentDirectoryPath" (MainBundlePath is not defined)
//     .then((result) => {
//         console.log('GOT RESULT', result);
//
//         // stat the first file
//         return Promise.all([RNFS.stat(result[0].path), result[0].path]);
//     })
//     .then((statResult) => {
//         if (statResult[0].isFile()) {
//             // if we have a file, read it
//             return RNFS.readFile(statResult[1], 'utf8');
//         }
//
//         return 'no file';
//     })
//     .then((contents) => {
//         // log the file contents
//         console.log(contents);
//     })
//     .catch((err) => {
//         console.log(err.message, err.code);
//     });

//file creation
// create a path you want to write to
// :warning: on iOS, you cannot write into `RNFS.MainBundlePath`,
// but `RNFS.DocumentDirectoryPath` exists on both platforms and is writable
// var path = RNFS.DocumentDirectoryPath + '/test.txt';
//
// // write the file
// RNFS.writeFile(path, 'Lorem ipsum dolor sit amet', 'utf8')
//     .then((success) => {
//         console.log('FILE WRITTEN!');
//     })
//     .catch((err) => {
//         console.log(err.message);
//     });


//file deletion
// var path = RNFS.DocumentDirectoryPath + '/test.txt';
//
// return RNFS.unlink(path)
//     .then(() => {
//         console.log('FILE DELETED');
//     })
//     // `unlink` will throw an error, if the item to unlink does not exist
//     .catch((err) => {
//         console.log(err.message);
//     });