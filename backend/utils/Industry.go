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
		"consumer", "fashion", "grocery", "supermarket", "brand",
		"fmcg", "direct-to-consumer", "d2c", "wholesale", "merchandise",
	},
	"Textile & Garments": {
		"textile", "garment", "fabric", "weaving", "apparel", "clothing",
		"spinning", "dyeing", "knitting", "readymade", "cotton", "silk",
		"linen", "polyester", "thread",
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

// typoCorrections maps common misspellings/typos to corrected forms
// that the keyword-scoring can then match properly.
var typoCorrections = map[string]string{
	"textfile":     "textile",
	"texile":       "textile",
	"textiels":     "textile",
	"heathcare":    "healthcare",
	"helthcare":    "healthcare",
	"fianncial":    "financial",
	"finanical":    "financial",
	"financail":    "financial",
	"educaton":     "education",
	"eductaion":    "education",
	"manufacuring": "manufacturing",
	"manufacring":  "manufacturing",
	"hosptality":   "hospitality",
	"hosiptality":  "hospitality",
	"realestate":   "real estate",
	"realstate":    "real estate",
	"trasportation": "transportation",
	"logisitcs":    "logistics",
	"technolgy":    "technology",
	"technlogy":    "technology",
	"infomation":   "information",
	"retial":       "retail",
	"constuction":  "construction",
	"agricuture":   "agriculture",
}

// levenshtein computes the Levenshtein edit distance between two strings.
func levenshtein(a, b string) int {
	la, lb := len(a), len(b)
	if la == 0 {
		return lb
	}
	if lb == 0 {
		return la
	}

	// Use single row optimisation
	prev := make([]int, lb+1)
	for j := 0; j <= lb; j++ {
		prev[j] = j
	}

	for i := 1; i <= la; i++ {
		curr := make([]int, lb+1)
		curr[0] = i
		for j := 1; j <= lb; j++ {
			cost := 1
			if a[i-1] == b[j-1] {
				cost = 0
			}
			ins := curr[j-1] + 1
			del := prev[j] + 1
			sub := prev[j-1] + cost
			curr[j] = min3(ins, del, sub)
		}
		prev = curr
	}
	return prev[lb]
}

func min3(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

// keywordScore runs the keyword matching loop and returns the best department + score.
func keywordScore(lower string) (string, int) {
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
	return bestDept, bestScore
}

// NormalizeDepartment maps any raw industry string to one of the canonical departments.
// Uses keyword scoring first, then typo correction, then fuzzy matching.
// Returns "Others" as fallback when no match is found.
func NormalizeDepartment(raw string) string {
	if raw == "" {
		return "Others"
	}
	lower := strings.ToLower(strings.TrimSpace(raw))

	// Remove special characters except spaces and hyphens
	cleaned := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == ' ' || r == '-' {
			return r
		}
		return -1
	}, lower)
	if cleaned == "" {
		return "Others"
	}

	// Step 1: Direct keyword scoring on original input
	if dept, score := keywordScore(cleaned); score > 0 {
		return dept
	}

	// Step 2: Check typo corrections map and retry
	if corrected, ok := typoCorrections[cleaned]; ok {
		if dept, score := keywordScore(corrected); score > 0 {
			return dept
		}
	}
	// Also try without spaces for single-word typos
	noSpaces := strings.ReplaceAll(cleaned, " ", "")
	if corrected, ok := typoCorrections[noSpaces]; ok {
		if dept, score := keywordScore(corrected); score > 0 {
			return dept
		}
	}

	// Step 3: Fuzzy matching — find closest keyword using Levenshtein distance
	bestFuzzyDept := ""
	bestFuzzyDist := 999

	for dept, keywords := range departmentKeywords {
		for _, kw := range keywords {
			// Only fuzzy match keywords that are long enough (avoid false positives on "it", "ai", etc.)
			if len(kw) < 4 {
				continue
			}
			dist := levenshtein(cleaned, kw)
			// Allow up to distance 2 for keywords >= 4 chars, or distance 1 for shorter inputs
			maxDist := 2
			if len(cleaned) < 5 {
				maxDist = 1
			}
			if dist <= maxDist && dist < bestFuzzyDist {
				bestFuzzyDist = dist
				bestFuzzyDept = dept
			}
		}
	}

	if bestFuzzyDept != "" {
		return bestFuzzyDept
	}

	return "Others"
}
