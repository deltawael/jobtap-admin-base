declare namespace Access {
  /** access-key */
  type AccessKey = Api.Common.CommonRecord<{
    tenantId: string | null;
    AccessKeyID: string;
    AccessKeySecret: string;
    description: string | null;
  }>;

  /** access-key list */
  type AccessKeyList = Api.Common.PaginatingQueryRecord<AccessKey>;

  type AccessKeyModel = Pick<AccessKey, 'tenantId' | 'status' | 'description'>;

  /** access-key search params */
  type AccessKeySearchParams = CommonType.RecordNullable<Pick<AccessKey, 'status'> & Api.Common.CommonSearchParams>;
}
