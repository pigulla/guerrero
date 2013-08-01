/**
 * This is a dummy class to document type definitions used across different parts of guerrero.
 *
 * @class guerrero.types
 * @abstract
 */

//<editor-fold desc="FileInfo">
/**
 * An object that encapsulates information about a file.
 *
 * For local files, the `name` and `size` properties are basically redundant as that information is also contained in
 * the `info` object returned by `mediainfo`. Remote files, however, are downloaded partially into temporary files, so
 * that data would otherwise be lost.
 *
 * @class guerrero.types.FileInfo
 */

/**
 * @member guerrero.types.FileInfo
 * @property {string} name The name of the file.
 */

/**
 * @member guerrero.types.FileInfo
 * @property {string} formattedName
 * The formatted file name. See `{@link guerrero.collector.AbstractCollector#formatFile}`.
 */

/**
 * @member guerrero.types.FileInfo
 * @property {number} size The size of the file.
 */

/**
 * @member guerrero.types.FileInfo
 * @property {guerrero.types.MediaInfo} info The mediainfo object.
 */
//</editor-fold>

//<editor-fold desc="ProgressStatus">
/**
 * The object used by `progress` events.
 *
 * @class guerrero.types.ProgressStatus
 */

/**
 * @member guerrero.types.ProgressStatus
 * @property {number} done The number of completed tasks.
 */

/**
 * @member guerrero.types.ProgressStatus
 * @property {number} total The total number of tasks.
 */
//</editor-fold>

//<editor-fold desc="MediaInfo">
/**
 * The object returned by `mediainfo`.
 *
 * @class guerrero.types.MediaInfo
 */
//</editor-fold>
