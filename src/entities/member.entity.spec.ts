import { instanceToPlain } from 'class-transformer';
import { Member } from './member.entity';
import { Post } from './post.entity';

describe('Member serialization', () => {
  it('회원 응답에서 password를 제외한다', () => {
    const member = Object.assign(new Member(), {
      id: 1,
      email: 'member@test.com',
      password: 'hashed-password',
    });

    expect(instanceToPlain(member)).not.toHaveProperty('password');
  });

  it('중첩된 게시글 회원 관계에서도 password를 제외한다', () => {
    const writer = Object.assign(new Member(), {
      id: 1,
      password: 'writer-hash',
    });
    const commenter = Object.assign(new Member(), {
      id: 2,
      password: 'commenter-hash',
    });
    const post = Object.assign(new Post(), {
      member: writer,
      comments: [{ member: commenter }],
    });

    const plain = instanceToPlain(post) as {
      member: Record<string, unknown>;
      comments: Array<{ member: Record<string, unknown> }>;
    };

    expect(plain.member).not.toHaveProperty('password');
    expect(plain.comments[0].member).not.toHaveProperty('password');
  });
});
