/**
 * I/O Abstraction Layer
 */

export {
  type IFileSystem,
  RealFileSystem,
  MockFileSystem,
  getFileSystem,
  setFileSystem,
  resetFileSystem
} from './filesystem';
