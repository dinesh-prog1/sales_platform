package service

import (
	"context"
	"fmt"
	"io"

	"github.com/aisales/backend/models"
	"github.com/aisales/backend/repository"
	"github.com/aisales/backend/utils"
)

type CompanyService struct {
	repo *repository.CompanyRepository
}

func NewCompanyService(repo *repository.CompanyRepository) *CompanyService {
	return &CompanyService{repo: repo}
}

func (s *CompanyService) UploadCompanies(ctx context.Context, r io.Reader) (*models.CompanyUploadResult, error) {
	parseResult, err := utils.ParseCompanies(r)
	if err != nil {
		return nil, fmt.Errorf("parse excel: %w", err)
	}

	companies := make([]*models.Company, 0, len(parseResult.Companies))
	for _, row := range parseResult.Companies {
		dept := utils.NormalizeDepartment(row.Industry)
		companies = append(companies, &models.Company{
			Name:          row.Name,
			Size:          models.CompanySize(row.Size),
			Email:         row.Email,
			ContactPerson: row.ContactPerson,
			Industry:      row.Industry,
			Department:    dept,
			Country:       row.Country,
			Status:        models.CompanyStatusUploaded,
		})
	}

	imported, skipped, err := s.repo.BulkCreate(ctx, companies)
	if err != nil {
		return nil, fmt.Errorf("bulk create companies: %w", err)
	}

	return &models.CompanyUploadResult{
		Total:    parseResult.Total,
		Imported: imported,
		Skipped:  skipped,
		Errors:   parseResult.Errors,
	}, nil
}

func (s *CompanyService) ListCompanies(ctx context.Context, f models.CompanyListFilter) (*models.CompanyListResponse, error) {
	return s.repo.List(ctx, f)
}

func (s *CompanyService) GetCompany(ctx context.Context, id string) (*models.Company, error) {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, fmt.Errorf("company not found")
	}
	return c, nil
}

func (s *CompanyService) UpdateStatus(ctx context.Context, id string, req models.CompanyUpdateStatusRequest) error {
	return s.repo.UpdateStatus(ctx, id, req.Status, req.Notes)
}

func (s *CompanyService) GetSizeStats(ctx context.Context) (*models.CompanySizeStats, error) {
	return s.repo.GetSizeStats(ctx)
}

func (s *CompanyService) GetStatusStats(ctx context.Context) (*models.CompanyStatusStats, error) {
	return s.repo.GetStatusStats(ctx)
}

func (s *CompanyService) SearchCompanies(ctx context.Context, q string) ([]*models.CompanySearchSuggestion, error) {
	if len(q) < 1 {
		return []*models.CompanySearchSuggestion{}, nil
	}
	return s.repo.SearchByName(ctx, q, 10)
}

func (s *CompanyService) GetEmailSuggestions(ctx context.Context, name string) ([]*models.CompanyEmailSuggestion, error) {
	if name == "" {
		return []*models.CompanyEmailSuggestion{}, nil
	}
	return s.repo.GetEmailsByName(ctx, name)
}

func (s *CompanyService) DeleteCompany(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *CompanyService) GetCompaniesForOutreach(ctx context.Context, targetSize string) ([]*models.Company, error) {
	if targetSize == "all" {
		return s.repo.GetByStatus(ctx, models.CompanyStatusUploaded)
	}

	companies, err := s.repo.GetByStatus(ctx, models.CompanyStatusUploaded)
	if err != nil {
		return nil, err
	}

	var filtered []*models.Company
	for _, c := range companies {
		if string(c.Size) == targetSize {
			filtered = append(filtered, c)
		}
	}
	return filtered, nil
}

// GetCompaniesForOutreachByQuota picks companies per size according to the configured
// quotas (small_quota / medium_quota / large_quota). When all quotas are 0 it falls
// back to the legacy target_size / emails_per_day behaviour.
func (s *CompanyService) GetCompaniesForOutreachByQuota(ctx context.Context, cfg *models.EmailConfig) ([]*models.Company, error) {
	total := cfg.SmallQuota + cfg.MediumQuota + cfg.LargeQuota
	if total == 0 {
		// Legacy: filter by target_size; QueueOutreachEmails caps to EmailsPerDay
		return s.GetCompaniesForOutreach(ctx, cfg.TargetSize)
	}

	var all []*models.Company
	for _, bucket := range []struct {
		size  models.CompanySize
		quota int
	}{
		{models.CompanySizeSmall, cfg.SmallQuota},
		{models.CompanySizeMedium, cfg.MediumQuota},
		{models.CompanySizeLarge, cfg.LargeQuota},
	} {
		if bucket.quota <= 0 {
			continue
		}
		cs, err := s.repo.GetByStatusSizeLimit(ctx, models.CompanyStatusUploaded, bucket.size, bucket.quota)
		if err != nil {
			return nil, fmt.Errorf("fetch %s companies: %w", bucket.size, err)
		}
		all = append(all, cs...)
	}
	return all, nil
}
