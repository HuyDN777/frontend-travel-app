const { searchKnowledge } = require('./services/knowledgeService');

async function test() {
  console.log('Testing search for "Hà Nội"...');
  const results = await searchKnowledge('Hà Nội', ['văn hóa']);
  console.log(`Found ${results.length} items.`);
  results.slice(0, 5).forEach(item => {
    console.log(`- Title: ${item.title}`);
  });

  if (results.length > 0) {
    console.log('SUCCESS: Found related topics for Hà Nội.');
  } else {
    console.log('FAILURE: No topics found for Hà Nội.');
  }
}

test();
