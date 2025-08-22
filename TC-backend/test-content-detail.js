// Simple test script for the new content detail endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/trpc';

async function testContentDetail() {
  try {
    console.log('🔍 Testing enhanced content detail functionality...\n');

    // Test 1: Search for content to get an ID
    console.log('1. Searching for Ted Bundy content...');
    const searchResponse = await axios.get(`${BASE_URL}/content.search`, {
      params: {
        input: JSON.stringify({
          query: 'ted bundy',
          page: 1,
          limit: 5,
          filters: { region: 'US' },
          sort: 'relevance'
        })
      }
    });

    if (searchResponse.data.result?.data?.results?.length > 0) {
      const firstContent = searchResponse.data.result.data.results[0];
      console.log(`✅ Found content: "${firstContent.title}" (ID: ${firstContent.id})`);

      // Test 2: Get detailed content information
      console.log('\n2. Getting detailed content information...');
      const detailResponse = await axios.get(`${BASE_URL}/content.getExternalContent`, {
        params: {
          input: JSON.stringify({
            externalId: firstContent.id
          })
        }
      });

      const contentDetail = detailResponse.data.result?.data;
      if (contentDetail) {
        console.log(`✅ Retrieved detailed information for: "${contentDetail.title}"`);
        console.log(`   - Content Type: ${contentDetail.contentType}`);
        console.log(`   - Case Type: ${contentDetail.caseType}`);
        console.log(`   - Synopsis: ${contentDetail.synopsis?.substring(0, 100)}...`);
        console.log(`   - User Rating: ${contentDetail.userRatingAvg}/5 (${contentDetail.userRatingCount} votes)`);
        console.log(`   - Platforms: ${contentDetail.platforms?.length || 0} available`);
        console.log(`   - Cast: ${contentDetail.cast?.length || 0} members`);
        console.log(`   - Related Cases: ${contentDetail.relatedCases?.length || 0}`);
        console.log(`   - Related Killers: ${contentDetail.relatedKillers?.length || 0}`);
        
        // Test 3: Get related content
        console.log('\n3. Getting related content...');
        const relatedResponse = await axios.get(`${BASE_URL}/content.getRelated`, {
          params: {
            input: JSON.stringify({
              contentId: firstContent.id,
              type: 'similar',
              limit: 5
            })
          }
        });

        const relatedContent = relatedResponse.data.result?.data;
        if (relatedContent) {
          console.log(`✅ Found ${relatedContent.count} related content items`);
          relatedContent.results?.forEach((item, index) => {
            console.log(`   ${index + 1}. "${item.title}" (${item.contentType})`);
          });
        }
      }
    } else {
      console.log('❌ No content found in search results');
    }

    console.log('\n✅ Content detail functionality test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('   Error details:', error.response.data.error);
    }
  }
}

// Run the test
testContentDetail();