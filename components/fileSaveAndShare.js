// https://stackoverflow.com/questions/73680400/save-csv-as-local-file-with-expo-file-system
// import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
// import * as Permissions from 'expo-permissions';

export const saveFile = async (times, accel, mag, gyro) => {
    console.log("got", accel)
    let minlength = accel.length;
    if (mag.length < minlength) minlength = mag.length;
    if (gyro.length < minlength) minlength = gyro.length;
        
    let data = "";
    for (let i=0; i<minlength; i++) {
        let row = times[i] + "," + accel[i].x + "," + accel[i].y + "," + accel[i].z + "," + mag[i].x + "," + mag[i].y + "," + mag[i].z + "," + gyro[i].x + "," + gyro[i].y + "," + gyro[i].z + "\n";
        data += row;    
    }

    let directoryUri = FileSystem.documentDirectory;
    
    let fileUri = directoryUri + "data.csv";
    
    console.log("Final:", data);
    await FileSystem.writeAsStringAsync(fileUri, data, { encoding: FileSystem.EncodingType.UTF8 });
    
    return fileUri;
};
    
export const shareFile = async (fileUri) => {
    const canShare = await Sharing.isAvailableAsync();

    // Check if permission granted
    if (canShare) {
        try{
        const res = await Sharing.shareAsync(fileUri);
        console.log('shareAsync', res);
        return true;
        } catch {
        return false;
        }
    } else {
        alert("Permission for sharing is denied!")
    }
};

// export const saveFileToDownloads = async (fileUri) => {
//     const { status } = await Permissions.askAsync(Permissions.MEDIA_LIBRARY);
//     if (status === "granted") {
//         const asset = await MediaLibrary.createAssetAsync(fileUri)
//         await MediaLibrary.createAlbumAsync("Download", asset, false)
//     }
// }