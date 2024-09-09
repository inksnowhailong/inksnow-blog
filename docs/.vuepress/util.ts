import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * 递归获取指定目录下的所有 .md 文件路径
 * @param {string} dir - 要搜索的目录路径
 * @returns {Promise<string[]>} - 包含 .md 文件路径的数组
 */
export function getAllMdFilesSync(dir: string): string[] {
    let mdFiles: string[] = [];

    try {
        // 读取目录内容，获取目录下的所有文件和子目录（同步）
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        // 遍历目录项
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                // 如果是子目录，递归调用函数获取子目录下的 .md 文件
                const filesInSubDir = getAllMdFilesSync(fullPath);
                mdFiles = mdFiles.concat(filesInSubDir);
            } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') {
                // 如果是 .md 文件，添加到结果数组
                mdFiles.push(fullPath);
            }
        }
    } catch (error) {
        console.error(`读取目录出错：${(error as Error).message}`);
    }

    return mdFiles;
}

export function mdPathFormat(paths:string[],splitDir:string){
    return paths.map((path)=>{
        return path.replace(/\\/g,'/').split(splitDir)[1]
    })

}
