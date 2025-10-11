import fs from 'fs/promises';
import path from 'path';

async function validateAllExperiences() {
  const regions = ['north-america', 'south-america', 'europe', 'asia', 'oceania'];
  let totalExperiences = 0;
  const countryCounts = {};
  const inclusionStats = {
    wheelchair_accessible: 0,
    woman_owned: 0,
    bipoc_owned: 0,
    lgbtq_friendly: 0,
    family_friendly: 0
  };

  for (const region of regions) {
    const regionPath = `./data/experiences/${region}`;
    try {
      const files = await fs.readdir(regionPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = JSON.parse(
            await fs.readFile(path.join(regionPath, file), 'utf8')
          );
          
          const experiences = data.experiences || data;
          const country = experiences[0]?.country || 'Unknown';
          
          countryCounts[country] = experiences.length;
          totalExperiences += experiences.length;
          
          // Count inclusion tags
          experiences.forEach(exp => {
            exp.inclusion_tags?.forEach(tag => {
              if (inclusionStats[tag] !== undefined) {
                inclusionStats[tag]++;
              }
            });
          });
          
          console.log(`✅ ${country}: ${experiences.length} experiences`);
        }
      }
    } catch (err) {
      console.log(`⚠️  No ${region} folder yet`);
    }
  }

  console.log('\n📊 SUMMARY:');
  console.log(`Total experiences: ${totalExperiences}`);
  console.log(`Total countries: ${Object.keys(countryCounts).length}`);
  console.log('\n🏷️  INCLUSION STATISTICS:');
  Object.entries(inclusionStats).forEach(([tag, count]) => {
    const percentage = ((count / totalExperiences) * 100).toFixed(1);
    console.log(`${tag}: ${count} (${percentage}%)`);
  });
}

validateAllExperiences();

