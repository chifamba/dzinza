import boto3
from botocore.client import Config as BotoConfig
from botocore.exceptions import NoCredentialsError, PartialCredentialsError, ClientError
from fastapi import HTTPException, status
from typing import Optional, Dict, Any
import logging

from app.config import settings

logger = logging.getLogger(__name__) # Get logger instance
# Configure logger if not configured globally, e.g. in main.py
if not logger.hasHandlers():
    logging.basicConfig(level=logging.INFO) # Basic config if none exists

class S3ServiceClass:
    def __init__(self):
        self.s3_client = None
        self.s3_resource = None
        self.bucket_name = settings.S3_BUCKET_NAME
        self._is_connected = False
        self._initialized = False # To prevent multiple initializations

    async def initialize(self):
        """
        Initializes the S3 client and resource.
        This should be called on application startup.
        """
        if self._initialized:
            logger.info("S3Service already initialized.")
            return

        logger.info("Initializing S3Service...")
        try:
            aws_access_key_id = settings.ASSEMBLED_AWS_ACCESS_KEY_ID
            aws_secret_access_key = settings.ASSEMBLED_AWS_SECRET_ACCESS_KEY

            if not aws_access_key_id or not aws_secret_access_key:
                logger.warning("AWS credentials not fully configured. S3Service operations may fail.")
                self._is_connected = False
                self._initialized = True # Mark as initialized even if connection fails to prevent re-attempts
                return

            session = boto3.Session(
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key,
                region_name=settings.AWS_REGION,
            )

            s3_config_dict = {
                'signature_version': 's3v4',
                'retries': {'max_attempts': 3, 'mode': 'standard'}
            }
            if settings.S3_FORCE_PATH_STYLE and settings.S3_ENDPOINT_URL: # Specific for MinIO usually
                 s3_config_dict['s3'] = {'addressing_style': 'path'}

            s3_config = BotoConfig(**s3_config_dict)

            client_args = {'config': s3_config}
            resource_args = {'config': s3_config}

            if settings.S3_ENDPOINT_URL:
                client_args['endpoint_url'] = settings.S3_ENDPOINT_URL
                client_args['use_ssl'] = settings.S3_ENDPOINT_URL.startswith('https')
                resource_args['endpoint_url'] = settings.S3_ENDPOINT_URL
                resource_args['use_ssl'] = settings.S3_ENDPOINT_URL.startswith('https')
                logger.info(f"Using S3 endpoint URL: {settings.S3_ENDPOINT_URL}")


            self.s3_client = session.client('s3', **client_args)
            self.s3_resource = session.resource('s3', **resource_args)

            try:
                # Boto3 client operations are synchronous.
                # For FastAPI startup, this is generally acceptable.
                # If it becomes a bottleneck, consider `run_in_threadpool`.
                self.s3_client.head_bucket(Bucket=self.bucket_name)
                logger.info(f"Successfully connected to S3 bucket: {self.bucket_name}")
                self._is_connected = True
            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code")
                if error_code == '404' or error_code == 'NoSuchBucket':
                    logger.error(f"S3 bucket '{self.bucket_name}' not found.")
                elif error_code == '403':
                    logger.error(f"Access denied to S3 bucket '{self.bucket_name}'. Check credentials and permissions.")
                else:
                    logger.error(f"Error connecting to S3 bucket '{self.bucket_name}': {e}")
                self._is_connected = False
        except (NoCredentialsError, PartialCredentialsError):
            logger.error("AWS S3 credentials not found or incomplete.")
            self._is_connected = False
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}", exc_info=True)
            self._is_connected = False
        finally:
            self._initialized = True


    def is_connected(self) -> bool:
        return self._is_connected

    async def upload_file(
        self,
        file_buffer: bytes,
        object_name: str,
        content_type: str = 'application/octet-stream',
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        if not self.s3_client or not self._is_connected:
            logger.error("S3 client not initialized or connection failed. Cannot upload file.")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Storage service is currently unavailable (S3 connection).")

        s3_metadata_formatted = {k.lower(): v for k, v in metadata.items()} if metadata else {}

        extra_args = {'ContentType': content_type}
        if s3_metadata_formatted:
            extra_args['Metadata'] = s3_metadata_formatted

        try:
            # For FastAPI, ideally use run_in_threadpool for blocking I/O
            # from fastapi.concurrency import run_in_threadpool
            # await run_in_threadpool(
            #     self.s3_client.put_object,
            #     Bucket=self.bucket_name,
            #     Key=object_name,
            #     Body=file_buffer,
            #     **extra_args
            # )
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=object_name,
                Body=file_buffer,
                **extra_args
            )

            # Construct public URL (this might vary based on bucket settings and CDN)
            if settings.S3_ENDPOINT_URL: # MinIO or other S3 compatible
                public_url = f"{settings.S3_ENDPOINT_URL.rstrip('/')}/{self.bucket_name}/{object_name.lstrip('/')}"
            else: # AWS S3
                public_url = f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{object_name.lstrip('/')}"

            logger.info(f"File {object_name} uploaded to S3 bucket {self.bucket_name}.")
            return {
                "s3_key": object_name,
                "url": public_url, # Consider if a presigned URL is needed for GET, or if objects are public-read
                "bucket": self.bucket_name,
                "metadata": s3_metadata_formatted # Return the formatted metadata used
            }
        except ClientError as e:
            logger.error(f"S3 ClientError during upload of {object_name}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not upload file to S3: {e.response.get('Error', {}).get('Message', 'Unknown S3 error')}")
        except Exception as e:
            logger.error(f"Unexpected error during S3 upload of {object_name}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not upload file due to an unexpected error.")

    async def delete_file(self, object_name: str) -> bool:
        if not self.s3_client or not self._is_connected:
            logger.error("S3 client not initialized or connection failed. Cannot delete file.")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Storage service is currently unavailable (S3 connection).")
        try:
            # await run_in_threadpool(self.s3_client.delete_object, Bucket=self.bucket_name, Key=object_name)
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=object_name)
            logger.info(f"File {object_name} deleted from S3 bucket {self.bucket_name}.")
            return True
        except ClientError as e:
            logger.error(f"S3 ClientError during deletion of {object_name}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not delete file from S3: {e.response.get('Error', {}).get('Message', 'Unknown S3 error')}")
        except Exception as e:
            logger.error(f"Unexpected error during S3 deletion of {object_name}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete file due to an unexpected error.")

    async def get_presigned_url(
        self,
        object_name: str,
        operation_name: str = 'get_object',
        expires_in: Optional[int] = None, # Uses settings.S3_PRESIGNED_URL_EXPIRATION if None
        params: Optional[Dict[str, Any]] = None,
        http_method: Optional[str] = None # For presigned POST URLs
    ) -> Optional[str]:
        if not self.s3_client or not self._is_connected:
            logger.error("S3 client not initialized or connection failed. Cannot generate presigned URL.")
            return None # Or raise

        s3_params = {'Bucket': self.bucket_name, 'Key': object_name}
        if params:
            s3_params.update(params)

        current_expires_in = expires_in if expires_in is not None else settings.S3_PRESIGNED_URL_EXPIRATION

        try:
            # url = await run_in_threadpool(
            #     self.s3_client.generate_presigned_url,
            #     ClientMethod=operation_name,
            #     Params=s3_params,
            #     ExpiresIn=current_expires_in,
            #     HttpMethod=http_method # For presigned POST
            # )
            url = self.s3_client.generate_presigned_url(
                ClientMethod=operation_name,
                Params=s3_params,
                ExpiresIn=current_expires_in,
                HttpMethod=http_method
            )
            return url
        except ClientError as e:
            logger.error(f"Could not generate presigned URL for {object_name}: {e}", exc_info=True)
            return None
        except Exception as e:
            logger.error(f"Unexpected error generating presigned URL for {object_name}: {e}", exc_info=True)
            return None

    async def close(self):
        logger.info("S3Service close called (boto3 client typically doesn't need explicit close for default session).")
        self._initialized = False # Allow re-initialization if app restarts
        self._is_connected = False
        self.s3_client = None
        self.s3_resource = None


S3Client = S3ServiceClass()

async def startup_s3_client():
    await S3Client.initialize()

async def shutdown_s3_client():
    await S3Client.close()
