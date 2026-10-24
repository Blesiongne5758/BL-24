// Public browser configuration template.
// The deployment workflow generates config.js from GitHub Variables.
// Never put Supabase service keys or Cloudinary API secrets here.
window.BURSA_LIMBAH_CONFIG = {
  apiBaseUrl: 'https://api.example.com',
  supabase: {
    url: 'https://[PROJECT_REF].supabase.co',
    anonKey: 'REPLACE_WITH_SUPABASE_ANON_OR_PUBLISHABLE_KEY'
  },
  cloudinary: {
    cloudName: 'REPLACE_WITH_CLOUDINARY_CLOUD_NAME',
    uploadPreset: 'REPLACE_WITH_UNSIGNED_UPLOAD_PRESET',
    folder: 'bursalimbah'
  }
};
