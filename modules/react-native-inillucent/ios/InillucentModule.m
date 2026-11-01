// The iOS half of the bridge: the Inillucent native module over the inillucent C library.
//
// Values cross the C boundary as the engine's own JSON: parameters are bound with
// inillucent_bind_json and results are read with inillucent_rows_json. Every call runs on one
// serial queue, which is the lock the C library asks its caller to hold.

#import <React/RCTBridgeModule.h>
#import <React/RCTInvalidating.h>
#import "inillucent_driver.h"

/** One open database and the one connection the bridge runs every statement on. */
@interface InillucentOpenDatabase : NSObject
@property (nonatomic, assign) inillucent_db *db;
@property (nonatomic, assign) inillucent_conn *conn;
@end

@implementation InillucentOpenDatabase
@end

@interface InillucentModule : NSObject <RCTBridgeModule, RCTInvalidating>
@end

/**
 * The status name for a C status code, matching the names the Android bridge rejects with.
 * @param status - the INILLUCENT_* status
 */
static NSString *InillucentStatusName(int32_t status) {
  switch (status) {
    case INILLUCENT_UNSUPPORTED: return @"UNSUPPORTED";
    case INILLUCENT_SYNTAX: return @"SYNTAX";
    case INILLUCENT_NOT_FOUND: return @"NOT_FOUND";
    case INILLUCENT_CONSTRAINT: return @"CONSTRAINT";
    case INILLUCENT_READONLY: return @"READONLY";
    case INILLUCENT_BUSY: return @"BUSY";
    case INILLUCENT_INTERRUPTED: return @"INTERRUPTED";
    case INILLUCENT_CORRUPT: return @"CORRUPT";
    case INILLUCENT_IO: return @"IO";
    case INILLUCENT_FULL: return @"FULL";
    case INILLUCENT_TOO_BIG: return @"TOO_BIG";
    case INILLUCENT_INVALID_STATE: return @"INVALID_STATE";
    default: return @"INTERNAL";
  }
}

/**
 * Rejects a promise with the status and message an inillucent error carries, then frees the error.
 * @param status - the status the call returned
 * @param error - the error the call filled in, or NULL
 * @param reject - the promise's reject block
 */
static void InillucentReject(int32_t status, inillucent_error *error, RCTPromiseRejectBlock reject) {
  NSString *message = @"inillucent call failed";
  if (error != NULL) {
    status = inillucent_error_status(error);
    const char *text = inillucent_error_message(error);
    if (text != NULL) {
      message = [NSString stringWithUTF8String:text] ?: message;
    }
    inillucent_rows_free(inillucent_error_take_rows(error));
    inillucent_error_free(error);
  }
  reject(InillucentStatusName(status), message, nil);
}

@implementation InillucentModule {
  NSMutableDictionary<NSNumber *, InillucentOpenDatabase *> *_databases;
  NSInteger _nextId;
  dispatch_queue_t _queue;
}

RCT_EXPORT_MODULE(Inillucent)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (instancetype)init {
  if ((self = [super init])) {
    _databases = [NSMutableDictionary new];
    _nextId = 1;
    _queue = dispatch_queue_create("com.jasonmcaffee.inillucent", DISPATCH_QUEUE_SERIAL);
  }
  return self;
}

- (dispatch_queue_t)methodQueue {
  return _queue;
}

/** The open database for an id, or nil after rejecting the promise. */
- (InillucentOpenDatabase *)liveDatabase:(double)dbId reject:(RCTPromiseRejectBlock)reject {
  InillucentOpenDatabase *open = _databases[@((NSInteger)dbId)];
  if (open == nil) {
    reject(@"BRIDGE", [NSString stringWithFormat:@"database %ld is not open", (long)dbId], nil);
  }
  return open;
}

RCT_EXPORT_METHOD(version:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  resolve([NSString stringWithUTF8String:inillucent_version()]);
}

RCT_EXPORT_METHOD(open:(NSString *)path key:(NSString *)key resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  NSString *folder = [path stringByDeletingLastPathComponent];
  [[NSFileManager defaultManager] createDirectoryAtPath:folder withIntermediateDirectories:YES attributes:nil error:nil];
  inillucent_db *db = NULL;
  inillucent_error *error = NULL;
  int32_t status = (key != nil && (id)key != [NSNull null])
    ? inillucent_open_with_key(path.UTF8String, INILLUCENT_OPEN_CREATE, key.UTF8String, &db, &error)
    : inillucent_open(path.UTF8String, INILLUCENT_OPEN_CREATE, &db, &error);
  if (status != INILLUCENT_OK) {
    InillucentReject(status, error, reject);
    return;
  }
  inillucent_conn *conn = NULL;
  status = inillucent_connect(db, &conn, &error);
  if (status != INILLUCENT_OK) {
    inillucent_close(db, NULL);
    InillucentReject(status, error, reject);
    return;
  }
  InillucentOpenDatabase *open = [InillucentOpenDatabase new];
  open.db = db;
  open.conn = conn;
  NSNumber *dbId = @(_nextId++);
  _databases[dbId] = open;
  resolve(dbId);
}

RCT_EXPORT_METHOD(execute:(double)dbId sql:(NSString *)sql params:(NSArray *)params resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  InillucentOpenDatabase *open = [self liveDatabase:dbId reject:reject];
  if (open == nil) {
    return;
  }
  NSError *jsonError = nil;
  NSData *paramsJson = [NSJSONSerialization dataWithJSONObject:(params ?: @[]) options:0 error:&jsonError];
  if (paramsJson == nil) {
    reject(@"BRIDGE", jsonError.localizedDescription ?: @"the parameters are not JSON", jsonError);
    return;
  }
  inillucent_stmt *stmt = NULL;
  inillucent_error *error = NULL;
  int32_t status = inillucent_prepare(open.conn, sql.UTF8String, &stmt, &error);
  if (status == INILLUCENT_OK) {
    status = inillucent_bind_json(stmt, paramsJson.bytes, paramsJson.length, &error);
  }
  inillucent_rows *rows = NULL;
  if (status == INILLUCENT_OK) {
    status = inillucent_stmt_execute(stmt, UINT64_MAX, &rows, &error);
  }
  inillucent_stmt_free(stmt);
  if (status != INILLUCENT_OK) {
    InillucentReject(status, error, reject);
    return;
  }
  size_t length = 0;
  const char *json = inillucent_rows_json(rows, &length);
  NSData *data = [NSData dataWithBytes:json length:length];
  inillucent_rows_free(rows);
  NSDictionary *result = [NSJSONSerialization JSONObjectWithData:data options:0 error:&jsonError];
  if (![result isKindOfClass:[NSDictionary class]]) {
    reject(@"BRIDGE", jsonError.localizedDescription ?: @"the result is not a JSON object", jsonError);
    return;
  }
  resolve(@{
    @"columns": result[@"columns"] ?: @[],
    @"rows": result[@"rows"] ?: @[],
    @"changes": result[@"affected"] ?: [NSNull null],
  });
}

RCT_EXPORT_METHOD(executeBatch:(double)dbId sql:(NSString *)sql resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  InillucentOpenDatabase *open = [self liveDatabase:dbId reject:reject];
  if (open == nil) {
    return;
  }
  inillucent_error *error = NULL;
  int32_t status = inillucent_execute_batch(open.conn, sql.UTF8String, &error);
  if (status != INILLUCENT_OK) {
    InillucentReject(status, error, reject);
    return;
  }
  resolve([NSNull null]);
}

RCT_EXPORT_METHOD(backupTo:(double)dbId path:(NSString *)path resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  InillucentOpenDatabase *open = [self liveDatabase:dbId reject:reject];
  if (open == nil) {
    return;
  }
  NSString *folder = [path stringByDeletingLastPathComponent];
  [[NSFileManager defaultManager] createDirectoryAtPath:folder withIntermediateDirectories:YES attributes:nil error:nil];
  inillucent_error *error = NULL;
  int32_t status = inillucent_backup_to(open.db, path.UTF8String, &error);
  if (status != INILLUCENT_OK) {
    InillucentReject(status, error, reject);
    return;
  }
  resolve([NSNull null]);
}

RCT_EXPORT_METHOD(integrityCheck:(double)dbId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  InillucentOpenDatabase *open = [self liveDatabase:dbId reject:reject];
  if (open == nil) {
    return;
  }
  inillucent_error *error = NULL;
  int32_t status = inillucent_integrity_check(open.db, &error);
  if (status != INILLUCENT_OK) {
    InillucentReject(status, error, reject);
    return;
  }
  resolve([NSNull null]);
}

RCT_EXPORT_METHOD(close:(double)dbId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  NSNumber *key = @((NSInteger)dbId);
  InillucentOpenDatabase *open = _databases[key];
  if (open == nil) {
    resolve([NSNull null]);
    return;
  }
  [_databases removeObjectForKey:key];
  inillucent_conn_free(open.conn);
  inillucent_error *error = NULL;
  int32_t status = inillucent_close(open.db, &error);
  if (status != INILLUCENT_OK) {
    InillucentReject(status, error, reject);
    return;
  }
  resolve([NSNull null]);
}

- (void)invalidate {
  for (InillucentOpenDatabase *open in _databases.allValues) {
    inillucent_conn_free(open.conn);
    inillucent_close(open.db, NULL);
  }
  [_databases removeAllObjects];
}

@end
