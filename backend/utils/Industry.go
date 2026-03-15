package utils

import "strings"

// departmentKeywords maps each canonical department to keywords that identify it.
var departmentKeywords = map[string][]string{
	"Technology & IT": {
		"tech", "it", "information technology", "software", "saas", "cloud",
		"cybersecurity", "ai", "artificial intelligence", "data", "digital",
		"internet", "web", "app", "mobile", "telecom", "telecommunications",
		"hardware", "semiconductor", "networking", "devops", "programming",
		"computer", "analytics", "machine learning", "ml", "iot",
	},
	"Healthcare & Medical": {
		"health", "medical", "hospital", "clinic", "pharma", "pharmaceutical",
		"biotech", "biotechnology", "nursing", "dental", "therapy", "wellness",
		"life science", "diagnostics", "healthcare", "medicine", "doctor",
		"patient", "radiology", "surgery",
	},
	"Education": {
		"education", "school", "university", "college", "training", "learning",
		"e-learning", "elearning", "academy", "tutoring", "edtech", "teaching",
		"curriculum", "student", "academic", "institute", "coaching",
	},
	"Retail & E-commerce": {
		"retail", "ecommerce", "e-commerce", "shop", "store", "marketplace",
		"consumer", "fashion", "apparel", "grocery", "supermarket", "brand",
		"fmcg", "direct-to-consumer", "d2c", "wholesale", "merchandise",
	},
	"Manufacturing & Industrial": {
		"manufacturing", "industrial", "factory", "production", "assembly",
		"engineering", "mechanical", "chemical", "plastics", "metals",
		"automotive", "aerospace", "defence", "defense", "energy", "oil",
		"gas", "mining", "utilities", "power", "electronics manufacturing",
	},
	"Hospitality & Tourism": {
		"hospitality", "hotel", "restaurant", "food", "beverage", "tourism",
		"travel", "airline", "aviation", "catering", "resort", "lodge",
		"events", "entertainment", "gaming", "casino", "cruise", "leisure",
	},
	"Financial Services": {
		"finance", "financial", "banking", "bank", "insurance", "investment",
		"capital", "wealth", "asset management", "fintech", "accounting",
		"audit", "tax", "credit", "payment", "lending", "mortgage",
		"hedge fund", "private equity", "venture capital",
	},
	"Real Estate & Construction": {
		"real estate", "realty", "construction", "property", "architecture",
		"building", "infrastructure", "contractor", "developer", "housing",
		"interior design", "facility", "land", "survey",
	},
	"Transportation & Logistics": {
		"transport", "logistics", "shipping", "freight", "supply chain",
		"courier", "delivery", "trucking", "rail", "maritime", "warehouse",
		"3pl", "fleet", "distribution",
	},
	"Professional Services": {
		"consulting", "legal", "law", "hr", "human resources", "recruitment",
		"staffing", "marketing", "advertising", "pr", "public relations",
		"research", "management consulting", "strategy", "outsourcing",
		"business services", "professional", "agency",
	},
	"Agriculture & Food": {
		"agriculture", "farming", "agri", "food processing", "dairy",
		"poultry", "fishery", "organic", "plantation", "crop", "seeds",
		"fertilizer", "agritech", "aquaculture",
	},
	"Wellness & Fitness": {
		"fitness", "gym", "yoga", "wellness", "spa", "beauty", "salon",
		"nutrition", "supplement", "mental health", "meditation", "pilates",
		"personal training",
	},
}

// NormalizeDepartment maps any raw industry string to one of the canonical departments.
// Returns "Professional Services" as fallback when no match is found.
func NormalizeDepartment(raw string) string {
	if raw == "" {
		return "Professional Services"
	}
	lower := strings.ToLower(strings.TrimSpace(raw))

	bestDept := ""
	bestScore := 0

	for dept, keywords := range departmentKeywords {
		score := 0
		for _, kw := range keywords {
			if strings.Contains(lower, kw) {
				if lower == kw {
					score += 10
				} else {
					score += 1
				}
			}
		}
		if score > bestScore {
			bestScore = score
			bestDept = dept
		}
	}

	if bestDept == "" {
		return "Professional Services"
	}
	return bestDept
}
