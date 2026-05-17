import fs from 'fs/promises';
import path from 'path';
import ignore from 'ignore';

/**
 * ProjectScanner handles recursive file discovery while respecting exclusions.
 */
export class ProjectScanner {
  constructor(options = {}) {
    this.extensions = options.extensions || ['.js', '.jsx', '.ts', '.tsx', '.cs'];
    this.exclude = options.exclude || ['node_modules', '.git', 'dist', 'bin', 'obj', '.expo'];
    this.ig = ignore().add(this.exclude);
  }

  async loadIgnores(rootDir) {
    for (const ignoreFile of ['.gitignore', '.vibeignore']) {
      try {
        const content = await fs.readFile(path.join(rootDir, ignoreFile), 'utf-8');
        this.ig.add(content);
      } catch (e) {
        // File does not exist, safe to ignore
      }
    }
  }

  /**
   * Recursively scans a directory for relevant files.
   * @param {string} dir The directory to scan.
   * @param {string} rootDir The root directory (used for relative paths).
   * @returns {Promise<string[]>} An array of absolute file paths.
   */
  async scan(dir, rootDir = null) {
    let results = [];
    
    if (!rootDir) {
      rootDir = dir;
      await this.loadIgnores(rootDir);
    }

    try {
      const list = await fs.readdir(dir);

      for (let file of list) {
        if (this.exclude.includes(file)) continue;

        const filePath = path.resolve(dir, file);
        const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

        try {
          const stat = await fs.stat(filePath);
          const isDir = stat.isDirectory();
          
          if (this.ig.ignores(isDir ? relPath + '/' : relPath)) {
            continue;
          }

          if (isDir) {
            const subResults = await this.scan(filePath, rootDir);
            results = results.concat(subResults);
          } else {
            if (this.extensions.includes(path.extname(filePath))) {
              results.push(filePath);
            }
          }
        } catch (e) {
          // Ignore files that cannot be stated
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}: ${error.message}`);
    }
    return results;
  }
}
