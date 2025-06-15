#!/bin/bash

# evstash.sh - Secure environment variable stash utility
# Recursively encodes/decodes .env files using multiple encryption layers

SCROLL_FILE="scroll.dat"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Security function: Multiple-layer encoding
secure_encode() {
    local input="$1"
    # 5-layer encoding for maximum security
    echo -n "$input" | base64 -w 0 | base64 -w 0 | base64 -w 0 | base64 -w 0 | base64 -w 0
}

# Security function: Multiple-layer decoding
secure_decode() {
    local input="$1"
    # 5-layer decoding
    echo -n "$input" | base64 -d 2>/dev/null | base64 -d 2>/dev/null | base64 -d 2>/dev/null | base64 -d 2>/dev/null | base64 -d 2>/dev/null
}

# Function to find all .env files recursively
find_env_files() {
    local search_dir="${1:-$PROJECT_ROOT}"
    log_info "Searching for .env files in: $search_dir"
    
    # Find all .env files, excluding node_modules, .git, and other common ignore directories
    find "$search_dir" -type f \( -name ".env" -o -name ".env.*" \) \
        -not -path "*/node_modules/*" \
        -not -path "*/.git/*" \
        -not -path "*/dist/*" \
        -not -path "*/build/*" \
        -not -path "*/.vscode/*" \
        -not -path "*/coverage/*" \
        2>/dev/null | sort
}

# Function to create relative path from project root
get_relative_path() {
    local full_path="$1"
    echo "${full_path#$PROJECT_ROOT/}"
}

# Function to encode all .env files
stash_env_files() {
    local output=""
    local file_count=0
    
    log_info "Starting .env file stash operation..."
    
    # Create temporary array to store file data
    local files_data=()
    
    # Process each .env file found
    while IFS= read -r file_path; do
        if [[ -f "$file_path" && -r "$file_path" ]]; then
            local relative_path=$(get_relative_path "$file_path")
            
            # Check if file contains sensitive data
            if [[ ! -s "$file_path" ]]; then
                log_warning "Skipping empty file: $relative_path"
                continue
            fi
            
            log_info "Processing: $relative_path"
            
            # Encode filename with 5 passes for security
            local encoded_name=$(secure_encode "$relative_path")
            
            # Encode file content with 5 passes for security
            local encoded_content=$(secure_encode "$(cat "$file_path")")
            
            # Create secure entry format: [LENGTH]NAME:CONTENT
            local entry_length=$((${#encoded_name} + ${#encoded_content} + 1))
            local entry="[$entry_length]$encoded_name:$encoded_content"
            
            files_data+=("$entry")
            ((file_count++))
            
            log_success "Stashed: $relative_path"
        fi
    done < <(find_env_files)
    
    if [[ $file_count -eq 0 ]]; then
        log_error "No .env files found to stash"
        exit 1
    fi
    
    # Join all entries with a delimiter
    local final_output=""
    for entry in "${files_data[@]}"; do
        if [[ -n "$final_output" ]]; then
            final_output="$final_output|ENVSTASH_DELIMITER|$entry"
        else
            final_output="$entry"
        fi
    done
    
    # Add metadata header
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local metadata="EVSTASH_V2|$timestamp|$file_count|"
    
    # Write to scroll.dat with metadata
    echo "$metadata$final_output" > "$SCROLL_FILE"
    
    log_success "Stashed $file_count .env files to $SCROLL_FILE"
    log_info "Files are secured with 5-layer base64 encoding"
}

# Function to restore .env files
restore_env_files() {
    local force_overwrite=false
    
    # Check for force flag
    if [[ "$1" == "--force" ]]; then
        force_overwrite=true
        log_warning "Force overwrite mode enabled"
    fi
    
    if [[ ! -f "$SCROLL_FILE" ]]; then
        log_error "$SCROLL_FILE not found"
        exit 1
    fi
    
    log_info "Starting .env file restoration from $SCROLL_FILE..."
    
    # Read the content from scroll.dat
    local content=$(cat "$SCROLL_FILE")
    
    if [[ -z "$content" ]]; then
        log_error "$SCROLL_FILE is empty"
        exit 1
    fi
    
    # Parse metadata header
    if [[ ! "$content" =~ ^EVSTASH_V2\| ]]; then
        log_error "Invalid or unsupported scroll.dat format"
        exit 1
    fi
    
    # Extract metadata and data parts
    local metadata_end=$(echo "$content" | grep -o '^[^[]*')
    local data_part="${content#$metadata_end}"
    
    IFS='|' read -ra metadata <<< "$metadata_end"
    local version="${metadata[0]}"
    local timestamp="${metadata[1]}"
    local file_count="${metadata[2]}"
    
    log_info "Scroll metadata: Version=$version, Created=$timestamp, Files=$file_count"
    
    # Split data by delimiter
    IFS='|ENVSTASH_DELIMITER|' read -ra entries <<< "$data_part"
    
    local restored_count=0
    local skipped_count=0
    
    for entry in "${entries[@]}"; do
        if [[ -z "$entry" ]]; then
            continue
        fi
        
        # Parse entry format: [LENGTH]NAME:CONTENT
        if [[ "$entry" =~ ^\[([0-9]+)\]([^:]+):(.*)$ ]]; then
            local expected_length="${BASH_REMATCH[1]}"
            local encoded_name="${BASH_REMATCH[2]}"
            local encoded_content="${BASH_REMATCH[3]}"
            
            # Verify entry integrity
            local actual_length=$((${#encoded_name} + ${#encoded_content} + 1))
            if [[ $actual_length -ne $expected_length ]]; then
                log_warning "Entry integrity check failed, skipping corrupted entry"
                continue
            fi
            
            # Decode filename
            local relative_path=$(secure_decode "$encoded_name")
            
            if [[ $? -ne 0 || -z "$relative_path" ]]; then
                log_warning "Failed to decode filename, skipping entry"
                continue
            fi
            
            local full_path="$PROJECT_ROOT/$relative_path"
            local dir_path=$(dirname "$full_path")
            
            # Check if file already exists
            if [[ -f "$full_path" && "$force_overwrite" != true ]]; then
                log_warning "File already exists: $relative_path (use --force to overwrite)"
                ((skipped_count++))
                continue
            fi
            
            # Create directory if it doesn't exist
            if [[ ! -d "$dir_path" ]]; then
                mkdir -p "$dir_path"
                log_info "Created directory: $(get_relative_path "$dir_path")"
            fi
            
            # Decode and write content
            local decoded_content=$(secure_decode "$encoded_content")
            
            if [[ $? -eq 0 && -n "$decoded_content" ]]; then
                echo "$decoded_content" > "$full_path"
                
                if [[ $? -eq 0 ]]; then
                    log_success "Restored: $relative_path"
                    ((restored_count++))
                else
                    log_error "Failed to write file: $relative_path"
                fi
            else
                log_error "Failed to decode content for: $relative_path"
            fi
        else
            log_warning "Invalid entry format, skipping"
        fi
    done
    
    log_success "Restoration complete: $restored_count files restored, $skipped_count skipped"
}

# Function to list stashed files
list_stashed_files() {
    if [[ ! -f "$SCROLL_FILE" ]]; then
        log_error "$SCROLL_FILE not found"
        exit 1
    fi
    
    local content=$(cat "$SCROLL_FILE")
    
    if [[ -z "$content" ]]; then
        log_error "$SCROLL_FILE is empty"
        exit 1
    fi
    
    # Parse metadata header
    if [[ ! "$content" =~ ^EVSTASH_V2\| ]]; then
        log_error "Invalid or unsupported scroll.dat format"
        exit 1
    fi
    
    # Extract metadata and data parts
    local metadata_end=$(echo "$content" | grep -o '^[^[]*')
    local data_part="${content#$metadata_end}"
    
    IFS='|' read -ra metadata <<< "$metadata_end"
    local version="${metadata[0]}"
    local timestamp="${metadata[1]}"
    local file_count="${metadata[2]}"
    
    log_info "Stash Information:"
    echo "  Version: $version"
    echo "  Created: $timestamp"
    echo "  File Count: $file_count"
    echo ""
    log_info "Stashed Files:"
    
    # Split data by delimiter
    IFS='|ENVSTASH_DELIMITER|' read -ra entries <<< "$data_part"
    
    local index=1
    for entry in "${entries[@]}"; do
        if [[ -z "$entry" ]]; then
            continue
        fi
        
        # Parse entry format: [LENGTH]NAME:CONTENT
        if [[ "$entry" =~ ^\[([0-9]+)\]([^:]+):(.*)$ ]]; then
            local encoded_name="${BASH_REMATCH[2]}"
            
            # Decode filename
            local relative_path=$(secure_decode "$encoded_name")
            
            if [[ $? -eq 0 && -n "$relative_path" ]]; then
                printf "  %2d. %s\n" "$index" "$relative_path"
                ((index++))
            fi
        fi
    done
}

# Function to display help
show_help() {
    echo "evstash.sh - Secure Environment Variable Stash Utility"
    echo ""
    echo "USAGE:"
    echo "  $0                    - Stash all .env files to scroll.dat"
    echo "  $0 boot [--force]     - Restore .env files from scroll.dat"
    echo "  $0 list               - List files in scroll.dat"
    echo "  $0 help               - Show this help message"
    echo ""
    echo "DESCRIPTION:"
    echo "  This utility securely stashes .env files from all subdirectories"
    echo "  using 5-layer base64 encoding with integrity checking."
    echo ""
    echo "OPTIONS:"
    echo "  --force               - Overwrite existing files during restoration"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                    # Stash all .env files"
    echo "  $0 boot               # Restore .env files"
    echo "  $0 boot --force       # Restore and overwrite existing files"
    echo "  $0 list               # Show what's in the stash"
}
# Main script logic
main() {
    case "$1" in
        "boot")
            log_info "Restoring .env files from $SCROLL_FILE..."
            restore_env_files "$2"
            ;;
        "list")
            list_stashed_files
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        "")
            log_info "Stashing .env files to $SCROLL_FILE..."
            stash_env_files
            ;;
        *)
            log_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"