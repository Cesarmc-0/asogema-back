import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(
        process.cwd(),
        'src/infrastructure/graphql/schema.gql',
      ),
      sortSchema: true,
      playground: true,
      path: '/graphql',
      context: ({ req }) => ({ req }),
    }),
  ],
})
export class GraphqlModule {}
