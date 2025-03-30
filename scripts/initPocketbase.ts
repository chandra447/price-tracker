import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.PB_URL || !process.env.PB_ADMIN_EMAIL || !process.env.PB_ADMIN_PASSWORD) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const pb = new PocketBase(process.env.PB_URL);
pb.autoCancellation(false);

// Collection definitions
const itemsCollection = {
  name: 'items',
  type: 'base',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'text',
      required: false,
    },
    {
      name: 'category',
      type: 'text',
      required: false,
    },
    {
      name: 'User',
      type: 'relation',
      required: true,
      maxSelect: 1,
      collectionId: '_pb_users_auth_',
    },
    {
      name: 'created_at',
      type: 'autodate',
      onCreate: true,
      onUpdate: false,
    },
    {
      name: 'updated_at',
      type: 'autodate',
      onCreate: true,
      onUpdate: true,
    },
  ],
  listRule: '@request.auth.id != "" && @request.auth.id = User.id',
  viewRule: '@request.auth.id != "" && @request.auth.id = User.id',
  createRule: '@request.auth.id != ""',
  updateRule: '@request.auth.id != "" && @request.auth.id = User.id',
  deleteRule: '@request.auth.id != "" && @request.auth.id = User.id',
};

async function deleteCollectionIfExists(collectionName: string) {
  try {
    const existingCollection = await pb.collections.getFirstListItem(`name="${collectionName}"`);
    await pb.collections.delete(existingCollection.id);
    console.log(`Deleted existing ${collectionName} collection`);
  } catch (err: unknown) {
    if (!(err instanceof Error && 'status' in err && err.status === 404)) {
      console.error(`Failed to delete ${collectionName} collection:`, err);
      throw err;
    }
  }
}

async function initCollections() {
  try {
    // Authenticate as admin
    await pb.collection("_superusers").authWithPassword(
      process.env.PB_ADMIN_EMAIL as string,
      process.env.PB_ADMIN_PASSWORD as string
    );

    // Delete existing collections
    await deleteCollectionIfExists('items');
    await deleteCollectionIfExists('prices');

    // Create items collection
    console.log('Creating items collection...');
    const createdItems = await pb.collections.create(itemsCollection);
    console.log('Created items collection:', createdItems.id);

    // Wait 1 second between collection creations
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create prices collection
    console.log('Creating prices collection...');
    const createdPrices = await pb.collections.create({
      name: 'prices',
      type: 'base',
      fields: [
        {
          name: 'price',
          type: 'number',
          required: true,
        },
        {
          name: 'item',
          type: 'relation',
          required: true,
          maxSelect: 1,
          collectionId: createdItems.id,  // Use the ID of the created items collection
        },
        {
          name: 'created_at',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated_at',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
    });
    console.log('Created prices collection:', createdPrices.id);

    console.log('Database initialization complete');
  } catch (err) {
    console.error('Initialization failed:', err);
    process.exit(1);
  }
}

initCollections();
