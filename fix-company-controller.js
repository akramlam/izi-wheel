const fs = require('fs');
const path = require('path');

// Path to the company controller
const controllerPath = path.join(__dirname, 'apps', 'api', 'src', 'controllers', 'company.controller.ts');

// Read the file
let content = fs.readFileSync(controllerPath, 'utf8');

// Find the getCompanies function
const getCompaniesRegex = /export const getCompanies = async \(req: Request, res: Response\) => \{[\s\S]*?try \{[\s\S]*?const companies = await prisma\.company\.findMany\(\);[\s\S]*?res\.status\(200\)\.json\(\{ companies \}\);[\s\S]*?\} catch \(error\) \{[\s\S]*?res\.status\(500\)\.json\(\{ error: 'Failed to fetch companies' \}\);[\s\S]*?\}\n\};/;

// Replace with improved version
const newGetCompanies = `export const getCompanies = async (req: Request, res: Response) => {
  try {
    // Use explicit select to avoid issues with schema changes
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        plan: true,
        maxWheels: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            wheels: true,
            admins: true
          }
        }
      }
    });
    
    // Add default value for remainingPlays
    const companiesWithDefaults = companies.map(company => ({
      ...company,
      remainingPlays: 50 // Default value
    }));
    
    res.status(200).json({ companies: companiesWithDefaults });
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
};`;

// Replace the function
content = content.replace(getCompaniesRegex, newGetCompanies);

// Write the file back
fs.writeFileSync(controllerPath, content, 'utf8');

console.log('Company controller updated successfully!'); 