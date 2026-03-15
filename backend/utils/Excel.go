package utils

import (
	"fmt"
	"io"
	"strings"

	"github.com/xuri/excelize/v2"
)

// ExcelCompanyRow represents one parsed row from an uploaded spreadsheet.
type ExcelCompanyRow struct {
	Name          string
	Size          string
	Email         string
	ContactPerson string
	Industry      string
	Country       string
}

// ExcelParseResult holds the outcome of parsing an Excel file.
type ExcelParseResult struct {
	Companies []ExcelCompanyRow
	Errors    []string
	Total     int
	Valid      int
}

// ParseCompanies parses an Excel/XLSX stream and returns company rows.
func ParseCompanies(r io.Reader) (*ExcelParseResult, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return nil, fmt.Errorf("open excel: %w", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("no sheets found in excel file")
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, fmt.Errorf("get rows: %w", err)
	}

	result := &ExcelParseResult{}

	if len(rows) < 2 {
		result.Errors = []string{}
		return result, nil
	}

	headerRowIdx := findHeaderRow(rows)
	if headerRowIdx == -1 {
		result.Errors = []string{"header row not found; expected columns like Company Name and Email"}
		return result, nil
	}

	header := rows[headerRowIdx]
	colIdx := findColumns(header)

	for i, row := range rows[headerRowIdx+1:] {
		lineNum := headerRowIdx + i + 2
		if isRowEmpty(row) {
			continue
		}
		result.Total++

		company, errs := parseRow(row, colIdx, lineNum)
		if len(errs) > 0 {
			result.Errors = append(result.Errors, errs...)
			continue
		}

		result.Companies = append(result.Companies, *company)
		result.Valid++
	}

	return result, nil
}

func findHeaderRow(rows [][]string) int {
	for i, row := range rows {
		idx := findColumns(row)
		if idx.name >= 0 && idx.email >= 0 {
			return i
		}
	}
	return -1
}

type columnIndex struct {
	name          int
	size          int
	email         int
	contactPerson int
	industry      int
	country       int
}

func findColumns(header []string) columnIndex {
	idx := columnIndex{
		name: -1, size: -1, email: -1,
		contactPerson: -1, industry: -1, country: -1,
	}
	for i, h := range header {
		lower := strings.ToLower(strings.TrimSpace(h))
		switch {
		case lower == "company name" || lower == "company" || lower == "name":
			idx.name = i
		case lower == "company size" || lower == "size":
			idx.size = i
		case lower == "email" || lower == "email address":
			idx.email = i
		case lower == "contact person" || lower == "contact" || lower == "contact name":
			idx.contactPerson = i
		case lower == "industry" || lower == "sector":
			idx.industry = i
		case lower == "country" || lower == "location":
			idx.country = i
		}
	}
	return idx
}

func parseRow(row []string, idx columnIndex, lineNum int) (*ExcelCompanyRow, []string) {
	var errs []string

	get := func(i int) string {
		if i < 0 || i >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[i])
	}

	company := &ExcelCompanyRow{
		Name:          get(idx.name),
		Size:          normalizeExcelSize(get(idx.size)),
		Email:         strings.ToLower(get(idx.email)),
		ContactPerson: get(idx.contactPerson),
		Industry:      get(idx.industry),
		Country:       get(idx.country),
	}

	if company.Name == "" {
		errs = append(errs, fmt.Sprintf("row %d: company name is required", lineNum))
	}
	if company.Email == "" {
		errs = append(errs, fmt.Sprintf("row %d: email is required", lineNum))
	} else if !isValidExcelEmail(company.Email) {
		errs = append(errs, fmt.Sprintf("row %d: invalid email '%s'", lineNum, company.Email))
	}
	if company.Size == "" {
		company.Size = "medium"
	}

	return company, errs
}

func isRowEmpty(row []string) bool {
	for _, cell := range row {
		if strings.TrimSpace(cell) != "" {
			return false
		}
	}
	return true
}

func normalizeExcelSize(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "small", "s", "1-50", "startup":
		return "small"
	case "large", "l", "enterprise", "500+", "1000+":
		return "large"
	default:
		return "medium"
	}
}

func isValidExcelEmail(email string) bool {
	return strings.Contains(email, "@") && strings.Contains(email, ".")
}
