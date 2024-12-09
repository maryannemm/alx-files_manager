import mime from 'mime-types';

export function getMimeType(filename) {
  return mime.lookup(filename) || 'application/octet-stream';
}

