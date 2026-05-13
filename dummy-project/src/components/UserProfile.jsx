import React from 'react';

const UserProfile = ({ data }) => {
  return <div dangerouslySetInnerHTML={{ __html: data }} />;
};
