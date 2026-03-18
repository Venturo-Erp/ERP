import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { parseTourCode } from '../utils/tourCodeParser';
import type { Attachment } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient(supabaseUrl, supabaseKey);

  const uploadFile = async (file: File, taskId: string): Promise<Attachment> => {
    try {
      setUploading(true);
      setError(null);

      // 1. 解析團號
      const { tourCode, isLegacy } = parseTourCode(file.name);

      // 2. 上傳到 Supabase Storage
      const filePath = `tasks/${taskId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. 取得公開 URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      // 4. 建立 Attachment 物件
      const attachment: Attachment = {
        id: uploadData.path,
        filename: file.name,
        url: publicUrl,
        size: file.size,
        uploaded_at: new Date().toISOString(),
        tour_code: tourCode,
        is_legacy: isLegacy,
      };

      // 5. 更新任務的 attachments
      const { data: task } = await supabase
        .from('tasks')
        .select('attachments, tour_code, is_legacy')
        .eq('id', taskId)
        .single();

      if (task) {
        const newAttachments = [...(task.attachments || []), attachment];
        const updates: any = { attachments: newAttachments };

        // 如果任務還沒有團號，更新團號
        if (!task.tour_code && tourCode) {
          updates.tour_code = tourCode;
          updates.is_legacy = isLegacy;
        }

        await supabase
          .from('tasks')
          .update(updates)
          .eq('id', taskId);
      }

      return attachment;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadFile,
    uploading,
    error,
  };
}
