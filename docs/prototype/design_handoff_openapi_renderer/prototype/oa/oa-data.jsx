// OpenAPI Renderer — 範例資料：petstore（使用者提供，3.2.0）、orders（3.1 邊界案例）、tiny（Swagger 截圖那份）、large（200+ ops）
(() => {
const R = (n) => ({ $ref: '#/components/schemas/' + n });
const ERR = { description: 'Unexpected error', content: { 'application/json': { schema: R('Error') } } };
const JX = (s) => ({ 'application/json': { schema: s }, 'application/xml': { schema: s } });
const JXF = (s) => ({ ...JX(s), 'application/x-www-form-urlencoded': { schema: s } });
const AUTH = [{ petstore_auth: ['write:pets', 'read:pets'] }];
const pid = (name, d) => ({ name, in: 'path', description: d, required: true, schema: { type: 'integer', format: 'int64' } });

const PETSTORE = {
  openapi: '3.2.0',
  info: {
    title: 'Swagger Petstore - OpenAPI 3.2',
    description: "This is a sample Pet Store Server based on the OpenAPI 3.2 specification. You can find out more about\nSwagger at [https://swagger.io](https://swagger.io). In the third iteration of the pet store, we've switched to the design first approach!\nYou can now help us improve the API whether it's by making changes to the definition itself or to the code.\nThat way, with time, we can improve the API in general, and expose some of the new features in OAS 3.2.\n\nSome useful links:\n- [The Pet Store repository](https://github.com/swagger-api/swagger-petstore)\n- [The source API definition for the Pet Store](https://github.com/swagger-api/swagger-petstore/blob/master/src/main/resources/openapi.yaml)\n- [OpenAPI 3.2 Specification](https://spec.openapis.org/oas/v3.2.0.html)",
    termsOfService: 'https://swagger.io/terms/', contact: { email: 'apiteam@swagger.io' },
    license: { name: 'Apache 2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0.html' }, version: '1.0.13',
  },
  servers: [{ url: 'https://petstore32.swagger.io/api/v3', description: 'Production server (OAS 3.2)' }, { url: 'https://petstore-staging.swagger.io/api/v3', description: 'Staging server' }],
  tags: [
    { name: 'pet', summary: 'Pet management operations', description: 'Everything about your Pets' },
    { name: 'store', summary: 'Store and order management', description: 'Access to Petstore orders and inventory' },
    { name: 'user', summary: 'User account operations', description: 'Operations about user management and authentication' },
  ],
  paths: {
    '/pet': {
      put: { tags: ['pet'], summary: 'Update an existing pet.', description: 'Update an existing pet by Id.', operationId: 'updatePet',
        requestBody: { description: 'Update an existent pet in the store', content: JXF(R('Pet')), required: true },
        responses: { 200: { description: 'Successful operation', content: JX(R('Pet')) }, 400: { description: 'Invalid ID supplied' }, 404: { description: 'Pet not found' }, 422: { description: 'Validation exception' }, default: ERR }, security: AUTH },
      post: { tags: ['pet'], summary: 'Add a new pet to the store.', description: 'Add a new pet to the store.', operationId: 'addPet',
        requestBody: { description: 'Create a new pet in the store', content: JXF(R('Pet')), required: true },
        responses: { 200: { description: 'Successful operation', content: JX(R('Pet')) }, 400: { description: 'Invalid input' }, 422: { description: 'Validation exception' }, default: ERR }, security: AUTH },
    },
    '/pet/findByStatus': { get: { tags: ['pet'], summary: 'Finds Pets by status.', description: 'Multiple status values can be provided with comma separated strings.', operationId: 'findPetsByStatus',
      parameters: [{ name: 'status', in: 'query', description: 'Status values that need to be considered for filter', required: false, explode: true, schema: { type: 'string', default: 'available', enum: ['available', 'pending', 'sold'] } }],
      responses: { 200: { description: 'successful operation', content: JX({ type: 'array', items: R('Pet') }) }, 400: { description: 'Invalid status value' }, default: ERR }, security: AUTH } },
    '/pet/findByTags': { get: { tags: ['pet'], summary: 'Finds Pets by tags.', description: 'Multiple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.', operationId: 'findPetsByTags',
      parameters: [{ name: 'tags', in: 'query', description: 'Tags to filter by', required: false, explode: true, schema: { type: 'array', items: { type: 'string' } } }],
      responses: { 200: { description: 'successful operation', content: JX({ type: 'array', items: R('Pet') }) }, 400: { description: 'Invalid tag value' }, default: ERR }, security: AUTH } },
    '/pet/search': { query: { tags: ['pet'], summary: 'Advanced pet search with complex criteria',
      description: 'Search for pets using complex criteria sent in the request body.\nThe QUERY method is a new HTTP method in OAS 3.2 that allows sending\na request body with search parameters, providing more flexibility than GET.\n\nThis endpoint demonstrates the QUERY HTTP method introduced in OAS 3.2.0\nper draft-ietf-httpbis-safe-method-w-body.', operationId: 'searchPets',
      parameters: [{ name: 'limit', in: 'query', description: 'Maximum number of results to return', required: false, schema: { type: 'integer', default: 20, maximum: 100 } }, { name: 'offset', in: 'query', description: 'Number of results to skip for pagination', required: false, schema: { type: 'integer', default: 0, minimum: 0 } }],
      requestBody: { description: 'Complex search criteria for finding pets', required: true, content: { 'application/json': { schema: { type: 'object', properties: {
        name: { type: 'string', description: 'Filter by pet name (supports wildcards with *)', example: 'Fluffy*' },
        species: { type: 'string', description: 'Filter by species', enum: ['cat', 'dog', 'bird', 'fish', 'rabbit', 'other'], example: 'cat' },
        ageRange: { type: 'object', description: 'Filter by age range', properties: { min: { type: 'integer', minimum: 0, description: 'Minimum age in years' }, max: { type: 'integer', minimum: 0, description: 'Maximum age in years' } }, example: { min: 1, max: 5 } },
        status: { type: 'array', description: 'Filter by status (multiple values allowed)', items: { type: 'string', enum: ['available', 'pending', 'sold'] }, example: ['available', 'pending'] },
        tags: { type: 'array', description: 'Filter by tags (AND logic - pet must have all tags)', items: { type: 'string' }, example: ['friendly', 'indoor', 'trained'] },
        priceRange: { type: 'object', description: 'Filter by price range', properties: { min: { type: 'number', format: 'float', minimum: 0 }, max: { type: 'number', format: 'float', minimum: 0 } }, example: { min: 100, max: 500 } },
        sortBy: { type: 'string', description: 'Sort results by field', enum: ['name', 'age', 'price', 'status'], default: 'name', example: 'price' },
        sortOrder: { type: 'string', description: 'Sort order', enum: ['asc', 'desc'], default: 'asc', example: 'asc' },
      } },
      examples: { searchFriendlyCats: { summary: 'Search for friendly cats', value: { species: 'cat', ageRange: { min: 0, max: 5 }, status: ['available'], tags: ['friendly'], sortBy: 'age', sortOrder: 'asc' } }, searchAffordableDogs: { summary: 'Search for affordable dogs', value: { species: 'dog', priceRange: { min: 100, max: 300 }, status: ['available'], sortBy: 'price', sortOrder: 'asc' } } } } } },
      responses: { 200: { description: 'Search results with pagination metadata', content: { 'application/json': { schema: { type: 'object', properties: { results: { type: 'array', items: R('Pet') }, total: { type: 'integer', description: 'Total number of matching results' }, limit: { type: 'integer', description: 'Maximum results per page' }, offset: { type: 'integer', description: 'Current offset' }, hasMore: { type: 'boolean', description: 'Whether there are more results available' } } } } } },
        400: { description: 'Invalid search criteria', content: { 'application/json': { schema: R('Error') } } }, 413: { description: 'Request payload too large', content: { 'application/json': { schema: R('Error') } } }, default: ERR }, security: [{ petstore_auth: ['read:pets'] }] } },
    '/pet/{petId}': {
      get: { tags: ['pet'], summary: 'Find pet by identifier.', description: 'Returns a single pet.', operationId: 'getPetById', parameters: [pid('petId', 'ID of pet to return')],
        responses: { 200: { description: 'successful operation', content: JX(R('Pet')) }, 400: { description: 'Invalid ID supplied' }, 404: { description: 'Pet not found' }, default: ERR }, security: [{ api_key: [] }, ...AUTH] },
      post: { tags: ['pet'], summary: 'Updates a pet in the store with form data.', description: 'update a pet via the form data.', operationId: 'updatePetWithForm',
        parameters: [pid('petId', 'ID of pet that needs to be updated'), { name: 'name', in: 'query', description: 'Name of pet that needs to be updated', schema: { type: 'string' } }, { name: 'status', in: 'query', description: 'Status of pet that needs to be updated', schema: { type: 'string' } }],
        responses: { 200: { description: 'successfully updated' }, 400: { description: 'Invalid input' }, default: ERR }, security: AUTH },
      delete: { tags: ['pet'], summary: 'Deletes a pet.', description: 'delete a pet.', operationId: 'deletePet',
        parameters: [{ name: 'api_key', in: 'header', description: '', required: false, schema: { type: 'string' } }, pid('petId', 'Pet id to delete')],
        responses: { 200: { description: 'successful operation' }, 400: { description: 'Invalid pet value' }, default: ERR }, security: AUTH },
    },
    '/pet/{petId}/uploadImage': { post: { tags: ['pet'], summary: 'Uploads an image.', description: 'Upload an image of pet.', operationId: 'uploadFile',
      parameters: [pid('petId', 'ID of pet to update'), { name: 'additionalMetadata', in: 'query', description: 'Additional Metadata', required: false, schema: { type: 'string' } }],
      requestBody: { content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } },
      responses: { 200: { description: 'successful operation', content: { 'application/json': { schema: R('ApiResponse') } } }, default: ERR }, security: AUTH } },
    '/store/inventory': { get: { tags: ['store'], summary: 'Returns pet inventories by status.', description: 'Returns a map of status codes to quantities.', operationId: 'getInventory',
      responses: { 200: { description: 'successful operation', content: { 'application/json': { schema: { type: 'object', additionalProperties: { type: 'integer', format: 'int32' } } } } }, default: ERR }, security: [{ api_key: [] }] } },
    '/store/order': { post: { tags: ['store'], summary: 'Place an order for a pet.', description: 'Place a new order in the store.', operationId: 'placeOrder',
      requestBody: { content: JXF(R('Order')) },
      responses: { 200: { description: 'successful operation', content: { 'application/json': { schema: R('Order') } } }, 400: { description: 'Invalid input' }, 422: { description: 'Validation exception' }, default: ERR } } },
    '/store/order/search': { query: { tags: ['store'], summary: 'Search orders with complex filters',
      description: 'Search for orders using complex criteria in the request body.\nDemonstrates the QUERY HTTP method for advanced order filtering.\n\nThe QUERY method allows passing complex search parameters in a structured\nrequest body while maintaining the safe and idempotent semantics of GET.', operationId: 'searchOrders',
      parameters: [{ name: 'page', in: 'query', description: 'Page number for pagination', schema: { type: 'integer', default: 1, minimum: 1 } }, { name: 'pageSize', in: 'query', description: 'Number of results per page', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } }],
      requestBody: { description: 'Order search criteria', required: true, content: { 'application/json': { schema: { type: 'object', properties: {
        orderId: { type: 'integer', format: 'int64', description: 'Search by specific order ID' }, petId: { type: 'integer', format: 'int64', description: 'Filter by pet ID' },
        status: { type: 'array', description: 'Filter by order status', items: { type: 'string', enum: ['placed', 'approved', 'delivered'] }, example: ['approved', 'delivered'] },
        dateRange: { type: 'object', description: 'Filter by ship date range', properties: { from: { type: 'string', format: 'date-time', description: 'Start date (inclusive)' }, to: { type: 'string', format: 'date-time', description: 'End date (inclusive)' } }, example: { from: '2024-01-01T00:00:00Z', to: '2024-12-31T23:59:59Z' } },
        quantityRange: { type: 'object', description: 'Filter by quantity range', properties: { min: { type: 'integer', minimum: 0 }, max: { type: 'integer', minimum: 0 } }, example: { min: 1, max: 10 } },
        complete: { type: 'boolean', description: 'Filter by completion status', example: true },
        sortBy: { type: 'string', enum: ['id', 'shipDate', 'quantity', 'status'], default: 'shipDate', description: 'Field to sort by' },
        sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc', description: 'Sort direction' },
      } } } } },
      responses: { 200: { description: 'Search results with pagination', content: { 'application/json': { schema: { type: 'object', properties: { orders: { type: 'array', items: R('Order') }, pagination: { type: 'object', properties: { page: { type: 'integer' }, pageSize: { type: 'integer' }, totalPages: { type: 'integer' }, totalResults: { type: 'integer' } } } } } } } },
        400: { description: 'Invalid search parameters', content: { 'application/json': { schema: R('Error') } } }, 413: { description: 'Request payload too large', content: { 'application/json': { schema: R('Error') } } }, default: ERR }, security: [{ api_key: [] }] } },
    '/store/order/{orderId}': {
      get: { tags: ['store'], summary: 'Find purchase order by identifier.', description: 'For valid response try integer IDs with value <= 5 or > 10. Other values will generate exceptions.', operationId: 'getOrderById', parameters: [pid('orderId', 'ID of order that needs to be fetched')],
        responses: { 200: { description: 'successful operation', content: JX(R('Order')) }, 400: { description: 'Invalid ID supplied' }, 404: { description: 'Order not found' }, default: ERR } },
      delete: { tags: ['store'], summary: 'Delete purchase order by identifier.', description: 'For valid response try integer IDs with value < 1000. Anything above 1000 or non-integers will generate API errors.', operationId: 'deleteOrder', parameters: [pid('orderId', 'ID of the order that needs to be deleted')],
        responses: { 200: { description: 'successful operation' }, 400: { description: 'Invalid ID supplied' }, 404: { description: 'Order not found' }, default: ERR } },
    },
    '/user': { post: { tags: ['user'], summary: 'Create user.', description: 'This can only be done by the logged in user.', operationId: 'createUser', requestBody: { description: 'Created user object', content: JXF(R('User')) },
      responses: { 200: { description: 'successful operation', content: JX(R('User')) }, default: ERR } } },
    '/user/createWithList': { post: { tags: ['user'], summary: 'Creates list of users with given input array.', description: 'Creates list of users with given input array.', operationId: 'createUsersWithListInput',
      requestBody: { content: { 'application/json': { schema: { type: 'array', items: R('User') } } } }, responses: { 200: { description: 'Successful operation', content: JX(R('User')) }, default: ERR } } },
    '/user/login': { get: { tags: ['user'], summary: 'Logs user into the system.', description: 'log user into the system.', operationId: 'loginUser',
      parameters: [{ name: 'username', in: 'query', description: 'The user name for login', required: false, schema: { type: 'string' } }, { name: 'password', in: 'query', description: 'The password for login in clear text', required: false, schema: { type: 'string' } }],
      responses: { 200: { description: 'successful operation', headers: { 'X-Rate-Limit': { description: 'calls per hour allowed by the user', schema: { type: 'integer', format: 'int32' } }, 'X-Expires-After': { description: 'date in UTC when token expires', schema: { type: 'string', format: 'date-time' } } },
        content: { 'application/xml': { schema: { type: 'string' } }, 'application/json': { schema: { type: 'string' } } } }, 400: { description: 'Invalid username/password supplied' }, default: ERR } } },
    '/user/logout': { get: { tags: ['user'], summary: 'Logs out current logged in user session.', description: 'Log user out of system.', operationId: 'logoutUser', parameters: [], responses: { 200: { description: 'successful operation' }, default: { description: 'successful operation' } } } },
    '/user/{username}': {
      get: { tags: ['user'], summary: 'Get user by user name.', description: 'Get user details based on username.', operationId: 'getUserByName', parameters: [{ name: 'username', in: 'path', description: 'The name that needs to be fetched. Use user1 for testing', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'successful operation', content: JX(R('User')) }, 400: { description: 'Invalid username supplied' }, 404: { description: 'User not found' }, default: ERR } },
      put: { tags: ['user'], summary: 'Update user.', description: 'This can only be done by the logged in user.', operationId: 'updateUser', parameters: [{ name: 'username', in: 'path', description: 'name that need to be deleted', required: true, schema: { type: 'string' } }],
        requestBody: { description: 'Update an existent user in the store', content: JXF(R('User')) }, responses: { 200: { description: 'successful operation' }, default: ERR } },
      delete: { tags: ['user'], summary: 'Delete user.', description: 'This can only be done by the logged in user.', operationId: 'deleteUser', parameters: [{ name: 'username', in: 'path', description: 'The name that needs to be deleted', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'successful operation' }, 400: { description: 'Invalid username supplied' }, 404: { description: 'User not found' }, default: ERR } },
    },
  },
  components: {
    schemas: {
      Order: { type: 'object', properties: { id: { type: 'integer', format: 'int64', examples: [10] }, petId: { type: 'integer', format: 'int64', examples: [198772] }, quantity: { type: 'integer', format: 'int32', examples: [7] }, shipDate: { type: 'string', format: 'date-time' }, status: { type: 'string', description: 'Order Status', examples: ['approved'], enum: ['placed', 'approved', 'delivered'] }, complete: { type: 'boolean' } } },
      Customer: { type: 'object', properties: { id: { type: 'integer', format: 'int64', examples: [100000] }, username: { type: 'string', examples: ['fehguy'] }, address: { type: 'array', items: R('Address') } } },
      Address: { type: 'object', properties: { street: { type: 'string', examples: ['437 Lytton'] }, city: { type: 'string', examples: ['Palo Alto'] }, state: { type: 'string', examples: ['CA'] }, zip: { type: 'string', examples: ['94301'] } } },
      Category: { type: 'object', properties: { id: { type: 'integer', format: 'int64', examples: [1] }, name: { type: 'string', examples: ['Dogs'] } } },
      User: { type: 'object', properties: { id: { type: 'integer', format: 'int64', examples: [10] }, username: { type: 'string', examples: ['theUser'] }, firstName: { type: 'string', examples: ['John'] }, lastName: { type: 'string', examples: ['James'] }, email: { type: 'string', examples: ['john@email.com'] }, password: { type: 'string', examples: ['12345'] }, phone: { type: 'string', examples: ['12345'] }, userStatus: { type: 'integer', description: 'User Status', format: 'int32', examples: [1] } } },
      Tag: { type: 'object', properties: { id: { type: 'integer', format: 'int64' }, name: { type: 'string' } } },
      Pet: { required: ['name', 'photoUrls'], type: 'object', properties: { id: { type: 'integer', format: 'int64', examples: [10] }, name: { type: 'string', examples: ['doggie'] }, category: R('Category'), photoUrls: { type: 'array', items: { type: 'string' } }, tags: { type: 'array', items: R('Tag') }, status: { type: 'string', description: 'pet status in the store', enum: ['available', 'pending', 'sold'] } } },
      ApiResponse: { type: 'object', properties: { code: { type: 'integer', format: 'int32' }, type: { type: 'string' }, message: { type: 'string' } } },
      Error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } }, required: ['code', 'message'] },
    },
    securitySchemes: {
      petstore_auth: { type: 'oauth2', flows: { implicit: { authorizationUrl: 'https://petstore3.swagger.io/oauth/authorize', scopes: { 'write:pets': 'modify pets in your account', 'read:pets': 'read your pets' } } } },
      api_key: { type: 'apiKey', name: 'api_key', in: 'header' },
    },
  },
};

// ── orders：OAS 3.1 邊界案例（長 path、巢狀 >3 層、oneOf/anyOf/allOf、循環 $ref、deprecated、多 content-type、說明缺漏、未分類）──
const org = { $ref: '#/components/parameters/OrgId' };
const ORDERS = {
  openapi: '3.1.0',
  info: { title: 'TrendMile 訂單服務 API', version: '2.4.0', description: '訂單服務對外的 REST 介面，供 **一鍵發薪** 與內部後台呼叫。\n\n## 慣例\n- 所有金額以 `Money` 表示，`amount` 為最小貨幣單位（新台幣即「元」）\n- 時間一律 ISO 8601、UTC\n- 列表分頁使用 `page` / `pageSize`，上限 100\n\n錯誤格式見 `Problem`。' },
  servers: [{ url: 'https://api.trendmile.tw/orders', description: '正式環境' }, { url: 'https://staging-api.trendmile.tw/orders', description: '測試環境' }],
  tags: [{ name: 'orders', description: '建立、查詢、修改與取消訂單。' }, { name: 'members', description: '組織成員與角色指派。' }],
  security: [{ bearerAuth: [] }],
  paths: {
    '/v1/organizations/{orgId}/orders': {
      parameters: [org],
      get: { tags: ['orders'], operationId: 'listOrders', summary: '列出組織的訂單', description: '依建立時間由新到舊排序。`status` 可帶多個值，以逗號分隔。\n\n帶 `Accept: text/csv` 會回傳 CSV 匯出，欄位與 JSON 版相同。',
        parameters: [
          { name: 'status', in: 'query', description: '只回傳這些狀態的訂單', style: 'form', explode: false, schema: { type: 'array', items: { type: 'string', enum: ['draft', 'placed', 'paid', 'shipped', 'cancelled'] } }, example: ['placed', 'paid'] },
          { name: 'created_after', in: 'query', description: '只回傳這個時間之後建立的訂單', schema: { type: 'string', format: 'date-time' }, example: '2026-09-01T00:00:00Z' },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', description: '每頁筆數', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'X-Request-Id', in: 'header', description: '追蹤用的請求 ID，未帶會由閘道產生', schema: { type: 'string', format: 'uuid' } },
          { name: 'legacy_sort', in: 'query', deprecated: true, description: '舊版排序參數，2.0 起忽略', schema: { type: 'string' } },
          { name: 'tm_session', in: 'cookie', description: '後台登入時由瀏覽器自動帶入', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: '一頁訂單', headers: { 'X-Total-Count': { description: '符合條件的總筆數', schema: { type: 'integer' } } }, content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderPage' } }, 'text/csv': { schema: { type: 'string' }, example: 'id,status,total_amount,created_at\nord_8f2k,paid,1280,2026-09-28T03:12:00Z' } } },
          401: { $ref: '#/components/responses/Unauthorized' }, 429: { description: '超過速率限制，請依 `Retry-After` 秒數後重試' }, 500: { $ref: '#/components/responses/ServerError' },
        } },
      post: { tags: ['orders'], operationId: 'createOrder', summary: '建立訂單', description: '建立一張 `draft` 狀態的訂單。送出後需另外呼叫付款流程，訂單才會進入 `placed`。\n\n同一個 `Idempotency-Key` 在 24 小時內重送，會回傳第一次的結果。',
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, description: '冪等鍵，建議用 UUID v4', schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateOrderInput' } },
          'multipart/form-data': { schema: { type: 'object', required: ['payload'], properties: { payload: { $ref: '#/components/schemas/CreateOrderInput' }, attachment: { type: 'string', format: 'binary', description: '採購單掃描檔（PDF，5 MB 內）' } } } },
        } },
        responses: {
          201: { description: '已建立', headers: { Location: { description: '新訂單的網址', schema: { type: 'string', format: 'uri' } } }, content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          400: { description: '欄位驗證失敗', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationProblem' } }, 'application/problem+json': { schema: { $ref: '#/components/schemas/ValidationProblem' } } } },
          409: { description: '`Idempotency-Key` 已被另一筆不同內容的請求使用', content: { 'application/json': { schema: { $ref: '#/components/schemas/Problem' } } } },
          422: { description: '庫存不足或商品已下架', content: { 'application/json': { schema: { $ref: '#/components/schemas/Problem' } } } },
          500: { $ref: '#/components/responses/ServerError' },
        } },
    },
    '/v1/organizations/{orgId}/orders/{orderId}': {
      parameters: [org, { name: 'orderId', in: 'path', required: true, description: '訂單 ID', schema: { type: 'string', pattern: '^ord_[a-z0-9]{4,}$' }, example: 'ord_8f2k' }],
      get: { tags: ['orders'], operationId: 'getOrder', summary: '取得單筆訂單',
        parameters: [{ name: 'expand', in: 'query', description: '一併展開的關聯', schema: { type: 'array', items: { type: 'string', enum: ['customer', 'items.product'] } } }],
        responses: { 200: { description: '訂單', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } }, 404: { $ref: '#/components/responses/NotFound' } } },
      patch: { tags: ['orders'], operationId: 'updateOrder', summary: '修改訂單', description: '只接受 `draft` 狀態的訂單。未帶的欄位維持原值，帶 `null` 代表清空。',
        requestBody: { required: true, content: { 'application/merge-patch+json': { schema: { type: 'object', properties: { note: { type: ['string', 'null'], maxLength: 500 }, shipping: { $ref: '#/components/schemas/Shipping' } } } } } },
        responses: { 200: { description: '修改後的訂單', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } }, 404: { $ref: '#/components/responses/NotFound' }, 409: { description: '訂單已不是 `draft`' } } },
      delete: { tags: ['orders'], operationId: 'deleteOrder', deprecated: true, summary: '刪除訂單', description: '2.2 起改為軟刪除並標記為已棄用。請改用 `cancelOrder`，可保留取消原因與稽核紀錄。',
        responses: { 204: { description: '已刪除' }, 404: { $ref: '#/components/responses/NotFound' } } },
    },
    '/v1/organizations/{orgId}/orders/{orderId}/cancel': {
      parameters: [org, { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
      post: { tags: ['orders'], operationId: 'cancelOrder', summary: '取消訂單',
        requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string', enum: ['customer_request', 'out_of_stock', 'fraud', 'other'] }, comment: { type: 'string' } } } } } },
        responses: { 200: { description: '已取消', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } }, 409: { description: '已出貨的訂單不能取消' } } },
    },
    '/v1/organizations/{orgId}/members/{memberId}/roles': {
      parameters: [org, { name: 'memberId', in: 'path', required: true, description: '成員 ID', schema: { type: 'string' } }],
      get: { tags: ['members'], operationId: 'listMemberRoles', summary: '列出成員的角色', description: '回傳直接指派的角色，以及從所屬單位繼承來的角色。',
        responses: { 200: { description: '角色清單', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/RoleAssignment' } } } } }, 404: { $ref: '#/components/responses/NotFound' } } },
      put: { tags: ['members'], operationId: 'replaceMemberRoles', summary: '整批取代成員的角色',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['roles'], properties: { roles: { type: 'array', minItems: 1, items: { type: 'string', enum: ['owner', 'admin', 'accountant', 'viewer'] } } } } } } },
        responses: { 200: { description: '更新後的角色', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/RoleAssignment' } } } } } } },
    },
    '/v1/organizations/{orgId}/members/{memberId}': {
      parameters: [org, { name: 'memberId', in: 'path', required: true, schema: { type: 'string' } }],
      get: { tags: ['members'], operationId: 'getMember', summary: '取得成員',
        responses: { 200: { description: '成員', content: { 'application/json': { schema: { $ref: '#/components/schemas/Member' } } } } } },
    },
    '/healthz': { get: { operationId: 'healthz', summary: '健康檢查', security: [], responses: { 200: { description: 'OK', content: { 'text/plain': { schema: { type: 'string' }, example: 'ok' } } } } } },
  },
  components: {
    parameters: { OrgId: { name: 'orgId', in: 'path', required: true, description: '組織 ID', schema: { type: 'string' }, example: 'org_tm01' } },
    responses: {
      Unauthorized: { description: '未帶或帶了過期的 token', content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } } } },
      NotFound: { description: '找不到資源，或你沒有權限看到它', content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } } } },
      ServerError: { description: '伺服器錯誤', content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } } } },
    },
    schemas: {
      Money: { type: 'object', required: ['amount', 'currency'], description: '金額。`amount` 為最小貨幣單位的整數。', properties: { amount: { type: 'integer', example: 1280 }, currency: { type: 'string', enum: ['TWD', 'USD', 'JPY'], default: 'TWD' } } },
      CustomerRef: { type: 'object', required: ['id'], properties: { id: { type: 'string', example: 'cus_31aa' }, name: { type: 'string', readOnly: true } } },
      Address: { type: 'object', required: ['city', 'line1'], properties: { zip: { type: 'string', pattern: '^\\d{3}(\\d{2,3})?$', example: '806' }, city: { type: 'string', example: '高雄市' }, district: { type: 'string', example: '前鎮區' }, line1: { type: 'string', example: '成功二路 88 號' }, geo: { type: ['object', 'null'], description: '由地址解析服務回填', readOnly: true, properties: { lat: { type: 'number', format: 'double' }, lng: { type: 'number', format: 'double' } } } } },
      HomeDelivery: { type: 'object', title: '宅配', required: ['method', 'address'], properties: { method: { type: 'string', const: 'home', enum: ['home'] }, address: { $ref: '#/components/schemas/Address' }, timeslot: { type: 'string', enum: ['morning', 'afternoon', 'any'], default: 'any' } } },
      StorePickup: { type: 'object', title: '門市自取', required: ['method', 'storeId'], properties: { method: { type: 'string', enum: ['pickup'] }, storeId: { type: 'string', example: 'st_kh05' } } },
      Shipping: { description: '配送方式，依 `method` 判斷。', oneOf: [{ $ref: '#/components/schemas/HomeDelivery' }, { $ref: '#/components/schemas/StorePickup' }], discriminator: { propertyName: 'method' } },
      LineItemInput: { type: 'object', required: ['sku', 'quantity'], properties: {
        sku: { type: 'string', example: 'TL-PAY-STD' }, quantity: { type: 'integer', minimum: 1, example: 1 },
        unitPrice: { $ref: '#/components/schemas/Money' },
        options: { type: 'object', description: '加購與客製選項', properties: {
          gift: { type: 'object', description: '禮品包裝', properties: {
            wrap: { type: 'string', enum: ['none', 'standard', 'premium'], default: 'none' },
            card: { type: 'object', description: '附卡', properties: { message: { type: 'string', maxLength: 120 }, signature: { type: 'string' }, font: { type: 'string', enum: ['serif', 'sans'] } } },
          } },
          engraving: { type: ['string', 'null'], maxLength: 24 },
        } },
      } },
      CreateOrderInput: { type: 'object', required: ['customer', 'items', 'shipping'], properties: {
        customer: { allOf: [{ $ref: '#/components/schemas/CustomerRef' }, { type: 'object', properties: { contactPhone: { type: 'string', example: '0912-345-678' } } }] },
        items: { type: 'array', minItems: 1, maxItems: 50, items: { $ref: '#/components/schemas/LineItemInput' } },
        shipping: { $ref: '#/components/schemas/Shipping' },
        payment: { description: '付款方式。可給信用卡或企業月結，或兩者都給（優先月結）。', anyOf: [{ title: '信用卡', type: 'object', properties: { cardToken: { type: 'string' } } }, { title: '企業月結', type: 'object', properties: { accountId: { type: 'string' }, poNumber: { type: 'string' } } }] },
        note: { type: ['string', 'null'], maxLength: 500 },
        couponCode: { type: 'string', deprecated: true, description: '請改用 `promotions`' },
        promotions: { type: 'array', items: { type: 'string' } },
        metadata: { type: 'object', description: '自訂鍵值，最多 20 組', additionalProperties: { type: 'string' } },
      } },
      Order: { type: 'object', required: ['id', 'status', 'total', 'createdAt'], properties: {
        id: { type: 'string', example: 'ord_8f2k', readOnly: true },
        status: { type: 'string', enum: ['draft', 'placed', 'paid', 'shipped', 'cancelled'] },
        customer: { $ref: '#/components/schemas/CustomerRef' },
        items: { type: 'array', items: { $ref: '#/components/schemas/LineItemInput' } },
        shipping: { $ref: '#/components/schemas/Shipping' },
        total: { $ref: '#/components/schemas/Money' },
        category: { $ref: '#/components/schemas/Category' },
        legacy_code: { type: 'string', deprecated: true, description: '舊系統訂單編號，3.0 移除' },
        createdAt: { type: 'string', format: 'date-time', readOnly: true },
      } },
      OrderPage: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Order' } }, page: { type: 'integer' }, pageSize: { type: 'integer' }, total: { type: 'integer' } } },
      Category: { type: 'object', description: '商品分類，可無限層巢狀。', properties: { id: { type: 'string' }, name: { type: 'string' }, parent: { $ref: '#/components/schemas/Category' }, children: { type: 'array', items: { $ref: '#/components/schemas/Category' } } } },
      Member: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, unit: { $ref: '#/components/schemas/OrgUnit' } } },
      OrgUnit: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, manager: { $ref: '#/components/schemas/Member' } } },
      RoleAssignment: { type: 'object', properties: { role: { type: 'string', enum: ['owner', 'admin', 'accountant', 'viewer'] }, inheritedFrom: { anyOf: [{ $ref: '#/components/schemas/OrgUnit' }, { type: 'null' }] } } },
      Problem: { type: 'object', required: ['type', 'title', 'status'], description: 'RFC 9457 Problem Details。', properties: { type: { type: 'string', format: 'uri' }, title: { type: 'string' }, status: { type: 'integer' }, detail: { type: 'string' }, traceId: { type: 'string' } } },
      ValidationProblem: { allOf: [{ $ref: '#/components/schemas/Problem' }, { type: 'object', properties: { errors: { type: 'array', items: { type: 'object', properties: { field: { type: 'string', example: 'items[0].quantity' }, message: { type: 'string' } } } } } }] },
    },
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: '由一鍵發薪 SSO 發出，效期 1 小時' },
      partnerKey: { type: 'apiKey', in: 'header', name: 'X-Partner-Key', description: '合作夥伴伺服器對伺服器呼叫' },
    },
  },
};

// ── tiny：Swagger 截圖那份。2 支、沒有 tag、沒有 description ──
const TINY = {
  openapi: '3.0.0', info: { title: 'API', version: '1.0' },
  paths: {
    '/health': { get: { operationId: 'AppController_health', summary: 'App 健康狀態檢查', responses: { 200: { description: '', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseDto' } } } } } } },
    '/metrics': { get: { operationId: 'MetricsController_index', summary: '取得 Prometheus 指標', responses: { 200: { description: '', content: { 'text/plain': { schema: { type: 'string' } } } } } } },
  },
  components: { schemas: {
    ApiResponseDto: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/HealthStatusDto' }, timestamp: { type: 'string', format: 'date-time' } } },
    HealthStatusDto: { type: 'object', properties: { status: { type: 'string', enum: ['ok', 'degraded', 'down'] }, uptime: { type: 'number' }, version: { type: 'string' } } },
  } },
};

// ── large：20 個 tag、200+ operations ──
function makeLarge() {
  const tags = ['accounts', 'attendance', 'audit-logs', 'billing', 'branches', 'contracts', 'departments', 'documents', 'employees', 'exports', 'holidays', 'imports', 'insurance', 'leave', 'notifications', 'overtime', 'payroll', 'reports', 'shifts', 'webhooks'];
  const zh = ['帳號', '出勤', '稽核紀錄', '帳務', '分店', '合約', '部門', '文件', '員工', '匯出', '假日', '匯入', '勞健保', '請假', '通知', '加班', '薪資', '報表', '排班', 'Webhook'];
  const paths = {}; const schemas = {};
  tags.forEach((t, i) => {
    const S = t.replace(/(^|-)([a-z])/g, (m, a, c) => c.toUpperCase()).replace(/s$/, '');
    schemas[S] = { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' } } };
    schemas[S + 'Input'] = { type: 'object', properties: { name: { type: 'string' } } };
    const base = `/v2/${t}`; const one = `${base}/{${S.toLowerCase()}Id}`;
    const ref = (n) => ({ $ref: '#/components/schemas/' + n });
    const ok = (s) => ({ 200: { description: 'OK', content: { 'application/json': { schema: s } } } });
    paths[base] = { get: { tags: [t], operationId: `list${S}s`, summary: `列出${zh[i]}`, responses: ok({ type: 'array', items: ref(S) }) }, post: { tags: [t], operationId: `create${S}`, summary: `建立${zh[i]}`, requestBody: { content: { 'application/json': { schema: ref(S + 'Input') } } }, responses: ok(ref(S)) } };
    paths[one] = { get: { tags: [t], operationId: `get${S}`, summary: `取得單筆${zh[i]}`, responses: ok(ref(S)) }, patch: { tags: [t], operationId: `update${S}`, summary: `修改${zh[i]}`, responses: ok(ref(S)) }, delete: { tags: [t], operationId: `delete${S}`, summary: `刪除${zh[i]}`, deprecated: i % 7 === 3, responses: { 204: { description: '已刪除' } } } };
    const extra = ['archive', 'restore', 'history', 'permissions', 'comments', 'attachments', 'export'].slice(0, 3 + (i * 5) % 6);
    extra.forEach((x, j) => {
      const p = `${one}/${x}`;
      paths[p] = { [j % 3 === 0 ? 'post' : 'get']: { tags: [t], operationId: `${x}${S}`, summary: `${zh[i]} · ${x}`, responses: ok({ type: 'object' }) } };
      if (j % 2 === 1) paths[p].put = { tags: [t], operationId: `put${x}${S}`, summary: `更新${zh[i]} ${x}`, responses: ok({ type: 'object' }) };
    });
  });
  return { openapi: '3.0.3', info: { title: '一鍵發薪 Platform API', version: '5.12.0', description: '一鍵發薪對外開放的完整 API。依模組分為 20 個 tag。' }, servers: [{ url: 'https://api.countsalary.tw/v2' }], tags: tags.map((t, i) => ({ name: t, description: `${zh[i]}相關操作。` })), paths, components: { schemas, securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } }, security: [{ bearerAuth: [] }] };
}

window.OA_SPECS = {
  petstore: { file: 'api/petstore.openapi.json', spec: PETSTORE, updated: '2026-09-26', backTo: '寵物店串接筆記' },
  orders: { file: 'api/orders.openapi.json', spec: ORDERS, updated: '2026-09-30', backTo: '訂單服務串接筆記' },
  tiny: { file: 'api/health.openapi.json', spec: TINY, updated: '2026-09-12' },
  large: { file: 'api/countsalary-platform.openapi.json', spec: makeLarge(), updated: '2026-09-29' },
};
})();
