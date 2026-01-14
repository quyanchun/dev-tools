import type { Folder } from '../../../types';

interface FolderCardPreviewProps {
  folder: Folder;
}

export default function FolderCardPreview({ folder }: FolderCardPreviewProps) {
  return (
    <div
      className="glass-card w-[120px] h-[120px] relative"
    >
      {/* 文件夹背景 */}
      <div className="absolute inset-0 rounded-[20px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20"></div>
      </div>

      {/* 9宫格预览 */}
      <div className="relative h-full p-3 flex flex-col">
        {/* 预览网格 */}
        <div className="flex-1 grid grid-cols-3 gap-1 mb-2">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="bg-base-100/10 rounded-lg"
            ></div>
          ))}
        </div>

        {/* 文件夹名称 */}
        <div className="text-center h-4 flex items-center justify-center">
          <h3 className="font-semibold text-xs truncate px-1 leading-none">
            {folder.name}
          </h3>
        </div>
      </div>
    </div>
  );
}
