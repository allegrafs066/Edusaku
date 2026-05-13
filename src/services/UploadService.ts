import axios from 'axios';

export const uploadImage = async (
  baseUrl: string,
  imageUri: string,
  onProgress?: (progress: number) => void
) => {
  const formData = new FormData();
  
  // Extract filename and type from URI
  const filename = imageUri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image`;

  formData.append('image', {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  try {
    const response = await axios.post(`${baseUrl}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  } catch (error) {
    console.error('Upload failed', error);
    throw error;
  }
};
