package models

// UploadMediaResponse defines the payload returned after a successful upload.
type UploadMediaResponse struct {
	ID       string `json:"id"`
	Filename string `json:"filename"`
	URL      string `json:"url"` // Presigned URL
}
