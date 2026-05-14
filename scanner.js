import fs from 'fs/promises';
import path from 'path';

/**
 * ProjectScanner handles recursive file discovery while respecting exclusions.
 */
export class ProjectScanner {
  constructor(options = {}) {
    this.extensions = options.extensions || ['.js', '.jsx', '.ts', '.tsx', '.cs'];
    this.exclude = options.exclude || ['node_modules', '.git', 'dist', 'bin', 'obj'];
  }

  /**
   * Recursively scans a directory for relevant files.
   * @param {string} dir The directory to scan.
   * @returns {Promise<string[]>} An array of absolute file paths.
   */
  async scan(dir) {
    let results = [];
    try {
      const list = await fs.readdir(dir);

      for (let file of list) {
        if (this.exclude.includes(file)) continue;

        const filePath = path.resolve(dir, file);
        const stat = await fs.stat(filePath);

        if (stat && stat.isDirectory()) {
          const subResults = await this.scan(filePath);
          results = results.concat(subResults);
        } else {
          if (this.extensions.includes(path.extname(filePath))) {
            results.push(filePath);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}: ${error.message}`);
    }
    return results;
  }
}
