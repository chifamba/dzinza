package service

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestPerformBackup_LocalOnly(t *testing.T) {
	// Setup temp dir
	tmpDir, err := os.MkdirTemp("", "dzinza-backup-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	os.Setenv("BACKUP_DIR", tmpDir)
	// Ensure S3 is disabled
	os.Setenv("AWS_ACCESS_KEY_ID", "")
	os.Setenv("AWS_SECRET_ACCESS_KEY", "")

	svc := NewBackupService()

	err = svc.PerformBackup(context.Background())
	if err != nil {
		t.Errorf("PerformBackup failed: %v", err)
	}

	// Verify backup directory created
	// Format is YYYYMMDD_HHMMSS, so we just check if any subdir exists
	entries, err := os.ReadDir(tmpDir)
	if err != nil {
		t.Fatal(err)
	}

	if len(entries) == 0 {
		t.Error("expected backup subdirectory to be created")
	}

	if !entries[0].IsDir() {
		t.Error("expected entry to be a directory")
	}
}

func TestListBackups(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "dzinza-backup-list-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	os.Setenv("BACKUP_DIR", tmpDir)
	svc := NewBackupService()

	// Create dummy backup
	backupName := "20230101_120000"
	os.Mkdir(filepath.Join(tmpDir, backupName), 0755)

	backups, err := svc.ListBackups(context.Background())
	if err != nil {
		t.Fatalf("ListBackups failed: %v", err)
	}

	if len(backups) != 1 {
		t.Fatalf("expected 1 backup, got %d", len(backups))
	}

	if backups[0].Timestamp != backupName {
		t.Errorf("expected timestamp %s, got %s", backupName, backups[0].Timestamp)
	}
}
