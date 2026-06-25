import axios, { AxiosInstance } from 'axios';
import { AppConfig } from '../types';

export function createGitLabClient(config: AppConfig): AxiosInstance {
  return axios.create({
    baseURL: `${config.gitlab.baseUrl}/api/v4`,
    headers: {
      'PRIVATE-TOKEN': config.gitlab.token,
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  });
}
