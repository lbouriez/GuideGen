/**
 * I/O Abstraction Layer
 *
 * NOTE: Use dependency injection to get IFileSystem instances.
 * Do not use global singletons.
 */

export {
  type IFileSystem,
  RealFileSystem,
  MockFileSystem
} from './filesystem';
