import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.PB_URL || !process.env.PB_ADMIN_EMAIL || !process.env.PB_ADMIN_PASSWORD) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const pb = new PocketBase(process.env.PB_URL);
pb.autoCancellation(false);

async function initCollections() {
  try {
    // Authenticate as admin
    await pb.collection("_superusers").authWithPassword(
      process.env.PB_ADMIN_EMAIL as string,
      process.env.PB_ADMIN_PASSWORD as string
    );

    // Basic Items collection
    const itemsCollection = {
      name: 'items',
      type: 'base',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true
        }
      ]
    };

    // Basic Prices collection
    const pricesCollection = {
      name: 'prices',
      type: 'base',
      fields: [
        {
          name: 'item',
          type: 'relation',
          required: true,
          collectionName: 'items'
        },
        {
          name: 'price',
          type: 'number',
          required: true
        }
      ]
    };

    console.log('Initializing collections:', {itemsCollection, pricesCollection});

    // Delete existing collections if they exist
    try {
      const existingItems = await pb.collections.getFirstListItem(`name="${itemsCollection.name}"`);
      await pb.collections.delete(existingItems.id);
      console.log('Deleted existing items collection');
    } catch (err: unknown) {
      if (!(err instanceof Error && 'status' in err && err.status === 404)) {
        console.error('Failed to delete items collection:', err);
        throw err;
      }
    }

    try {
      const existingPrices = await pb.collections.getFirstListItem(`name="${pricesCollection.name}"`);
      await pb.collections.delete(existingPrices.id);
      console.log('Deleted existing prices collection');
    } catch (err: unknown) {
      if (!(err instanceof Error && 'status' in err && err.status === 404)) {
        console.error('Failed to delete prices collection:', err);
        throw err;
      }
    }

    // Create collections one at a time with delays
    try {
      console.log('Creating items collection...');
      const enhancedItemsCollection = {
        ...itemsCollection,
        fields: [
          ...itemsCollection.fields,
          {
            name: 'description',
            type: 'text',
            required: false
          },
          {
            name: 'category',
            type: 'text',
            required: false
          }
        ]
      };
      const createdItems = await pb.collections.create(enhancedItemsCollection);
      console.log('Created items collection:', createdItems);

      // Wait 1 second between collection creations
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Creating prices collection...');
      const enhancedPricesCollection = {
        name: 'prices',
        type: 'base',
        fields: [
          {
            name: 'id',
            type: 'text',
            required: true
          },
          {
            name: 'price',
            type: 'number',
            required: true
          },
          {
            name: 'item',
            type: 'relation',
            required: true,
            options: {
              collectionId: 'items',
              fieldId: 'id'
            }
          }
        ]
      };

      const createdPrices = await pb.collections.create(enhancedPricesCollection);
      console.log('Created prices collection:', createdPrices);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Detailed error:', {
          message: err.message,
          stack: err.stack,
          ...(typeof err === 'object' ? err : {})
        });
      }
      throw err;
    }

    console.log('Database initialization complete');
  } catch (err) {
    console.error('Initialization failed:', err);
    process.exit(1);
  }
}

initCollections();
