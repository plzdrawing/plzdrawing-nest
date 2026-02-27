import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const makeHost = (response: any, request: any) =>
    ({
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    }) as any;

  it('HttpException(object response)을 표준 형식으로 내려준다', () => {
    const filter = new HttpExceptionFilter();
    const json = jest.fn();
    const response = {
      status: jest.fn().mockReturnValue({ json }),
    };
    const request = { url: '/api/test' };

    filter.catch(
      new BadRequestException('bad request'),
      makeHost(response, request),
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        path: '/api/test',
        error: 'Bad Request',
        message: 'bad request',
        timestamp: expect.any(String),
      }),
    );
  });

  it('HttpException(string response)도 처리한다', () => {
    const filter = new HttpExceptionFilter();
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = { url: '/api/string' };

    filter.catch(
      new HttpException('string error', HttpStatus.CONFLICT),
      makeHost(response, request),
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        path: '/api/string',
        error: 'HttpException',
        message: 'string error',
      }),
    );
  });

  it('일반 Error는 500 Internal Server Error로 처리한다', () => {
    const filter = new HttpExceptionFilter();
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = { url: '/api/fail' };

    filter.catch(new Error('boom'), makeHost(response, request));

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        path: '/api/fail',
        error: 'Internal Server Error',
        message: 'Internal server error',
      }),
    );
  });
});
