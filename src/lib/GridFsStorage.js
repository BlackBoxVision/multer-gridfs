import defaultOptions from './utils/GridFsStorageConfig';
import GridFs from 'gridfs-stream';
import mongoose from 'mongoose';

const connection = mongoose.connection;
let gridFs;

connection.once('open', () => {
    gridFs = GridFs(connection.db, mongoose.mongo)
});

class GridFsStorage {
	constructor(options = {}) {
		this.getDestination = options.getDestination || defaultOptions.getDestination;
		this.onUploadFinish = options.onUploadFinish || defaultOptions.onUploadFinish;
		this.getFileName = options.getFileName || defaultOptions.getFileName;
		this.streamOptions = options.streamOptions || defaultOptions.streamOptions;
	}

	_handleFile = (request, file, callback) => {
		this.getDestination(request, file, error => {
			if (error) {
				return callback(error);
			}

			if (gridFs) {
				const filename = this.getFileName(file);
				const writeStreamOptions = {
					...this.streamOptions,
					filename
				};

				const outStream = gridFs.createWriteStream(writeStreamOptions);
				
				file.stream.pipe(outStream);
				
				outStream
					.on('error', error => callback(error))
					.on('close', insertedFile => callback(null, insertedFile))
					.on('finish', () => this.onUploadFinish(file));
			} else {
				return callback(new Error("GridFs is null, please initialize mongoose connection"));
			}
		})
	};
	
	_removeFile = (request, file, callback) => {
		if (gridFs) {
			gridFs.exist({_id: file._id}, (error, found) => {
				if (error) {
					callback(error);
				}
				
				if (found) {
					gridFs.remove({_id: file._id}, error => error ? callback(error) : callback(null, file._id));
				}
			});
		} else {
			return callback(new Error("GridFs is null, please initialize mongoose connection"));
		}
	};
}

export default GridFsStorage;