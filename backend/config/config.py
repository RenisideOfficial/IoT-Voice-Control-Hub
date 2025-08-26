import pymongo
from django.conf import settings

# Mongo Db connection using singleton principle
# good for speed and reusable TCP connection avoding
# muliple open connections
class MongoClientSingleton:
    _client = None
    
    @classmethod
    def get_mongo_client(cls):
        if cls._client is None:
            cls._client = pymongo.MongoClient(
                settings.MONGO_URI,
                username=settings.MONGO_USER,
                password=settings.MONGO_PASS,
                retryWrites=True,
                w='majority'
            )
            
        return cls._client
    
    @classmethod
    def get_db(cls):
        return cls.get_mongo_client()[settings.MONGO_DB_NAME]