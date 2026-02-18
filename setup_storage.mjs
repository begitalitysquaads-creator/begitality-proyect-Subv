import { createClient } from '@supabase/supabase-js';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Faltan variables de entorno SUPABASE_URL o SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
    console.log('Verificando bucket "convocatoria-files"...');

    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error('Error listando buckets:', error.message);
        return;
    }

    const bucketExists = buckets.some(b => b.name === 'convocatoria-files');

    if (bucketExists) {
        console.log('Bucket "convocatoria-files" ya existe.');
    } else {
        console.log('Creando bucket "convocatoria-files"...');
        const { data, error: createError } = await supabase.storage.createBucket('convocatoria-files', {
            public: false,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: ['application/pdf']
        });

        if (createError) {
            console.error('Error creando bucket:', createError.message);
        } else {
            console.log('Bucket creado exitosamente.');
        }
    }
}

setupStorage();
