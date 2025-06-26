import boto3
from botocore.client import Config
from botocore.exceptions import ClientError, NoCredentialsError, PartialCredentialsError
from fastapi import UploadFile
from typing import Optional, Dict, Tuple, AsyncGenerator
import io
import mimetypes

from app.core.config import settings
from app.utils.logger import logger

class S3Service:
    def __init__(self):
        self.s3_client = None
        self.s3_resource = None
        self.bucket_name = settings.S3_BUCKET_NAME

        if settings.S3_ACCESS_KEY_ID and settings.S3_SECRET_ACCESS_KEY: # Only init if creds are present
            try:
                session = boto3.session.Session()
                self.s3_client = session.client(
                    service_name='s3',
                    aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
                    endpoint_url=str(settings.S3_ENDPOINT_URL) if settings.S3_ENDPOINT_URL else None,
                    region_name=settings.S3_REGION_NAME,
                    use_ssl=settings.S3_USE_SSL,
                    verify=settings.S3_VERIFY_SSL, # Can be path to CA bundle or False
                    config=Config(signature_version='s3v4') # v4 is common
                )
                self.s3_resource = session.resource(
                    service_name='s3',
                    aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
                    endpoint_url=str(settings.S3_ENDPOINT_URL) if settings.S3_ENDPOINT_URL else None,
                    region_name=settings.S3_REGION_NAME,
                    use_ssl=settings.S3_USE_SSL,
                    verify=settings.S3_VERIFY_SSL,
                    config=Config(signature_version='s3v4')
                )
                # Try to access bucket to confirm connection and permissions (optional)
                # self.s3_client.head_bucket(Bucket=self.bucket_name)
                logger.info(f"S3Service initialized for bucket: {self.bucket_name}, endpoint: {settings.S3_ENDPOINT_URL or 'AWS S3'}")
            except (NoCredentialsError, PartialCredentialsError):
                logger.error("S3 credentials not found or incomplete. S3Service will not be functional.")
            except ClientError as e:
                if e.response['Error']['Code'] == 'NoSuchBucket':
                    logger.warning(f"S3 bucket '{self.bucket_name}' does not exist. Please create it.")
                    # Optionally create bucket here if permissions allow:
                    # self.s3_client.create_bucket(Bucket=self.bucket_name)
                else:
                    logger.error(f"Error initializing S3Service: {e}", exc_info=True)
            except Exception as e:
                 logger.error(f"Unexpected error initializing S3Service: {e}", exc_info=True)
        else:
            logger.warning("S3 Access Key or Secret Key not configured. S3Service will not be functional.")

    def _get_client(self):
        if not self.s3_client:
            # raise RuntimeError("S3Service not properly initialized or configured.")
            logger.error("S3 client not available. Check configuration and initialization.")
            return None
        return self.s3_client

    async def upload_file_obj(self, file_obj: io.BytesIO, s3_key: str, content_type: Optional[str] = None, metadata: Optional[Dict[str, str]] = None) -> bool:
        client = self._get_client()
        if not client: return False

        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
        if metadata:
            extra_args['Metadata'] = metadata

        try:
            file_obj.seek(0) # Ensure stream is at the beginning
            client.upload_fileobj(file_obj, self.bucket_name, s3_key, ExtraArgs=extra_args)
            logger.info(f"Successfully uploaded to S3: s3://{self.bucket_name}/{s3_key}")
            return True
        except ClientError as e:
            logger.error(f"S3 upload_fileobj error for key {s3_key}: {e}", exc_info=True)
            return False
        except Exception as e:
            logger.error(f"Unexpected error during S3 upload_fileobj for key {s3_key}: {e}", exc_info=True)
            return False

    async def upload_fastapi_file(self, file: UploadFile, s3_key: str, metadata: Optional[Dict[str, str]] = None) -> bool:
        client = self._get_client()
        if not client: return False

        extra_args = {'ContentType': file.content_type}
        if metadata:
            extra_args['Metadata'] = metadata

        try:
            # For UploadFile, read content into BytesIO or use upload_fileobj directly if it supports async file-like objects
            # Boto3's upload_fileobj is synchronous. To use with async FastAPI UploadFile,
            # you need to read the file content first (potentially in chunks for large files)
            # or run the boto3 call in a thread pool.

            # Simple approach: read entire file into memory (careful with large files)
            # contents = await file.read()
            # file_stream = io.BytesIO(contents)
            # client.upload_fileobj(file_stream, self.bucket_name, s3_key, ExtraArgs=extra_args)

            # More robust: use file.file which is a SpooledTemporaryFile (sync file-like object)
            # This might still block if not handled with threading.
            # For true async, libraries like aiobotocore would be needed, or run in threadpool.
            # For now, assume file.file can be passed to upload_fileobj.
            # Ensure file pointer is at the beginning.
            await file.seek(0)
            client.upload_fileobj(file.file, self.bucket_name, s3_key, ExtraArgs=extra_args)

            logger.info(f"Successfully uploaded FastAPI file to S3: s3://{self.bucket_name}/{s3_key}")
            return True
        except ClientError as e:
            logger.error(f"S3 upload FastAPI file error for key {s3_key}: {e}", exc_info=True)
            return False
        except Exception as e:
            logger.error(f"Unexpected error S3 upload FastAPI file for key {s3_key}: {e}", exc_info=True)
            return False


    async def generate_presigned_upload_url(self, s3_key: str, content_type: Optional[str] = None, expires_in: int = 3600) -> Optional[str]:
        client = self._get_client()
        if not client: return None

        params = {
            'Bucket': self.bucket_name,
            'Key': s3_key,
        }
        if content_type:
            params['ContentType'] = content_type

        try:
            url = client.generate_presigned_url(
                'put_object',
                Params=params,
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            logger.error(f"Error generating S3 presigned upload URL for key {s3_key}: {e}", exc_info=True)
            return None

    async def generate_presigned_download_url(self, s3_key: str, expires_in: int = settings.S3_PRESIGNED_URL_EXPIRY_SECONDS, filename: Optional[str] = None) -> Optional[str]:
        client = self._get_client()
        if not client: return None

        params = {'Bucket': self.bucket_name, 'Key': s3_key}
        if filename: # Suggest a filename for download
            params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'

        try:
            url = client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            logger.error(f"Error generating S3 presigned download URL for key {s3_key}: {e}", exc_info=True)
            return None

    async def delete_file(self, s3_key: str) -> bool:
        client = self._get_client()
        if not client: return False
        try:
            client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"Successfully deleted from S3: s3://{self.bucket_name}/{s3_key}")
            return True
        except ClientError as e:
            logger.error(f"S3 delete error for key {s3_key}: {e}", exc_info=True)
            return False

    async def get_file_metadata(self, s3_key: str) -> Optional[Dict[str, Any]]:
        client = self._get_client()
        if not client: return None
        try:
            response = client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return {
                "s3_key": s3_key,
                "size_bytes": response.get("ContentLength"),
                "mime_type": response.get("ContentType"),
                "last_modified": response.get("LastModified"),
                "etag": response.get("ETag", "").strip('"'), # AWS S3 ETag often has quotes
                "metadata": response.get("Metadata"), # Custom metadata
                "version_id": response.get("VersionId"),
            }
        except ClientError as e:
            if e.response['Error']['Code'] == '404' or e.response['Error']['Code'] == 'NoSuchKey':
                logger.warning(f"S3 file not found for metadata: s3://{self.bucket_name}/{s3_key}")
            else:
                logger.error(f"S3 head_object error for key {s3_key}: {e}", exc_info=True)
            return None

    async def download_file_obj(self, s3_key: str) -> Optional[io.BytesIO]:
        client = self._get_client()
        if not client: return None
        file_stream = io.BytesIO()
        try:
            client.download_fileobj(self.bucket_name, s3_key, file_stream)
            file_stream.seek(0) # Reset stream position to the beginning for reading
            return file_stream
        except ClientError as e:
            if e.response['Error']['Code'] == '404' or e.response['Error']['Code'] == 'NoSuchKey':
                logger.warning(f"S3 file not found for download: s3://{self.bucket_name}/{s3_key}")
            else:
                logger.error(f"S3 download_fileobj error for key {s3_key}: {e}", exc_info=True)
            return None

    def is_functional(self) -> bool:
        return self.s3_client is not None

# Note on async with boto3:
# Boto3 itself is synchronous. For a truly async FastAPI application,
# blocking S3 calls should be run in a thread pool (e.g., using `asyncio.to_thread` in Python 3.9+)
# or by using an async S3 client library like `aiobotocore`.
# Example with asyncio.to_thread:
# import asyncio
# async def upload_with_threadpool(self, ...):
#     loop = asyncio.get_running_loop()
#     await loop.run_in_executor(None, self.s3_client.upload_fileobj, ...) # None uses default ThreadPoolExecutor
# For simplicity in this conversion, I'm calling boto3 methods directly.
# This means they will block the event loop if not handled with threading.
# This is a key area for performance optimization in a production async app.
# The current structure assumes that either blocking is acceptable for the expected load,
# or that a later refactor will introduce proper async handling for these I/O calls.
