-- Allow custom work types in hakkedis
ALTER TABLE hakkedis
  DROP CONSTRAINT IF EXISTS valid_work_type;

-- Accept predefined types plus a generic "custom" marker
ALTER TABLE hakkedis
  ADD CONSTRAINT valid_work_type
  CHECK (work_type IN (
    'boya', 'siva', 'dekorasyon', 'cati', 'doseme', 'cam',
    'kapi_pencere', 'insaat', 'elektrik', 'tesisata', 'bahce', 'omur_isi',
    'custom'
  ));
