package repository

import (
	"context"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type s3Repository struct {
	client *s3.Client
	bucket string
}

func NewS3Repository(client *s3.Client, bucket string) StorageRepository {
	return &s3Repository{
		client: client,
		bucket: bucket,
	}
}

func (r *s3Repository) Upload(ctx context.Context, key string, body io.Reader, contentType string) error {
	_, err := r.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(r.bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String(contentType),
	})
	return err
}

func (r *s3Repository) GetPresignedURL(ctx context.Context, key string) (string, error) {
	presignClient := s3.NewPresignClient(r.client)
	res, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(r.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(time.Hour))
	if err != nil {
		return "", err
	}
	return res.URL, nil
}

func (r *s3Repository) Delete(ctx context.Context, key string) error {
	_, err := r.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(r.bucket),
		Key:    aws.String(key),
	})
	return err
}
