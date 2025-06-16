#!/bin/bash

# env-scroll.sh - Encode/decode .env files using base64

SCROLL_FILE="scroll.dat"

# Function to encode files
encode_files() {
    local output=""
    local found_files=false
    
    # Find all .env and .env.* files
    for file in .env .env.*; do
        # Check if file exists and is readable
        if [[ -f "$file" && -r "$file" ]]; then
            found_files=true
            # Encode filename with 3 passes
            local encoded_name=$(echo -n "$file" | base64 -w 0 | base64 -w 0 | base64 -w 0)
            # Encode file content with 3 passes
            local encoded_content=$(base64 -w 0 < "$file" | base64 -w 0 | base64 -w 0)
            
            # Append to output string
            if [[ -n "$output" ]]; then
                output="$output "
            fi
            output="$output$encoded_name:$encoded_content"
            
            echo "Encoded: $file (3-pass base64)"
        fi
    done
    
    if [[ "$found_files" == false ]]; then
        echo "No .env files found in current directory"
        exit 1
    fi
    
    # Write to scroll.dat
    echo "$output" > "$SCROLL_FILE"
    echo "All .env files encoded to $SCROLL_FILE"
}

# Function to decode files
decode_files() {
    if [[ ! -f "$SCROLL_FILE" ]]; then
        echo "Error: $SCROLL_FILE not found"
        exit 1
    fi
    
    # Read the single line from scroll.dat
    local content=$(cat "$SCROLL_FILE")
    
    if [[ -z "$content" ]]; then
        echo "Error: $SCROLL_FILE is empty"
        exit 1
    fi
    
    # Split by spaces to get key:value pairs
    IFS=' ' read -ra PAIRS <<< "$content"
    
    for pair in "${PAIRS[@]}"; do
        # Split by first colon to separate key and value
        local key="${pair%%:*}"
        local value="${pair#*:}"
        
        if [[ -n "$key" && -n "$value" ]]; then
            # Decode filename with 3 passes
            local filename=$(echo -n "$key" | base64 -d 2>/dev/null | base64 -d 2>/dev/null | base64 -d 2>/dev/null)
            
            if [[ $? -eq 0 && -n "$filename" ]]; then
                # Check if file already exists
                if [[ -e "$filename" ]]; then
                    echo "Error: File '$filename' already exists. Will not overwrite."
                    exit 1
                fi
                
                # Decode content with 3 passes and write to file
                echo -n "$value" | base64 -d 2>/dev/null | base64 -d 2>/dev/null | base64 -d 2>/dev/null > "$filename"
                
                if [[ $? -eq 0 ]]; then
                    echo "Decoded: $filename (3-pass base64)"
                else
                    echo "Error: Failed to decode content for $filename"
                fi
            else
                echo "Error: Failed to decode filename from key: $key"
            fi
        fi
    done
    
    echo "Decoding complete"
}

# Main script logic
case "$1" in
    "boot")
        echo "Decoding files from $SCROLL_FILE..."
        decode_files
        ;;
    "")
        echo "Encoding .env files to $SCROLL_FILE..."
        encode_files
        ;;
    *)
        echo "Usage: $0 [boot]"
        echo "  (no args) - Encode all .env files to $SCROLL_FILE"
        echo "  boot      - Decode files from $SCROLL_FILE"
        exit 1
        ;;
esac