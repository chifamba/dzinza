package repository

import (
	"context"
	"time"

	"github.com/chifamba/dzinza/services/help_support_service/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type Repository interface {
	CreateTicket(ctx context.Context, ticket *models.Ticket) error
	GetTicket(ctx context.Context, id string) (*models.Ticket, error)
	ListTickets(ctx context.Context, userID string) ([]models.Ticket, error)
	AddMessage(ctx context.Context, ticketID string, message models.Message) error
	UpdateStatus(ctx context.Context, ticketID string, status string) error
}

type mongodbRepository struct {
	collection *mongo.Collection
}

func NewMongoDBRepository(db *mongo.Database) Repository {
	return &mongodbRepository{
		collection: db.Collection("tickets"),
	}
}

func (r *mongodbRepository) CreateTicket(ctx context.Context, ticket *models.Ticket) error {
	ticket.CreatedAt = time.Now()
	ticket.UpdatedAt = time.Now()
	res, err := r.collection.InsertOne(ctx, ticket)
	if err != nil {
		return err
	}
	ticket.ID = res.InsertedID.(primitive.ObjectID).Hex()
	return nil
}

func (r *mongodbRepository) GetTicket(ctx context.Context, id string) (*models.Ticket, error) {
	objID, _ := primitive.ObjectIDFromHex(id)
	var ticket models.Ticket
	err := r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&ticket)
	if err != nil {
		return nil, err
	}
	return &ticket, nil
}

func (r *mongodbRepository) ListTickets(ctx context.Context, userID string) ([]models.Ticket, error) {
	filter := bson.M{}
	if userID != "" {
		filter["user_id"] = userID
	}
	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	var tickets []models.Ticket
	if err = cursor.All(ctx, &tickets); err != nil {
		return nil, err
	}
	return tickets, nil
}

func (r *mongodbRepository) AddMessage(ctx context.Context, ticketID string, message models.Message) error {
	objID, _ := primitive.ObjectIDFromHex(ticketID)
	message.CreatedAt = time.Now()
	_, err := r.collection.UpdateOne(ctx,
		bson.M{"_id": objID},
		bson.D{
			{"$push", bson.D{{"messages", message}}},
			{"$set", bson.D{{"updated_at", time.Now()}}},
		},
	)
	return err
}

func (r *mongodbRepository) UpdateStatus(ctx context.Context, ticketID string, status string) error {
	objID, _ := primitive.ObjectIDFromHex(ticketID)
	_, err := r.collection.UpdateOne(ctx,
		bson.M{"_id": objID},
		bson.D{
			{"$set", bson.D{{"status", status}, {"updated_at", time.Now()}}},
		},
	)
	return err
}
