package repository

import (
	"context"
	"errors"

	"github.com/chifamba/dzinza/services/auth_service/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type postgresRepository struct {
	db *gorm.DB
}

// NewPostgresRepository creates a new instance of the PostgreSQL repository.
func NewPostgresRepository(db *gorm.DB) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) CreateUser(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *postgresRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).Preload("Roles").Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *postgresRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).Preload("Roles").First(&user, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *postgresRepository) UpdateUser(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

func (r *postgresRepository) EmailExists(ctx context.Context, email string) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.User{}).Where("email = ?", email).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *postgresRepository) GetRoleByName(ctx context.Context, name string) (*models.Role, error) {
	var role models.Role
	if err := r.db.WithContext(ctx).Where("name = ?", name).First(&role).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &role, nil
}

func (r *postgresRepository) AssignRoleToUser(ctx context.Context, userID uuid.UUID, roleID uint) error {
	// GORM many-to-many relationship helper is usually easier
	// But let's use direct SQL for simplicity as "user_roles" is the join table
	return r.db.WithContext(ctx).Exec("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING", userID, roleID).Error
}

func (r *postgresRepository) RevokeRoleFromUser(ctx context.Context, userID uuid.UUID, roleID uint) error {
	return r.db.WithContext(ctx).Exec("DELETE FROM user_roles WHERE user_id = ? AND role_id = ?", userID, roleID).Error
}
