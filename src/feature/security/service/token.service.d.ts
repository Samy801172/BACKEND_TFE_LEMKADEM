import { Credential } from "../data/entity/credential.entity";
import { Token } from "../data/entity/token.entity";
import { RefreshTokenPayload } from "../data/payload/refresh-token.payload";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { User } from "@model/User/entities/user.entity";
export declare class TokenService {
    private readonly repository;
    private readonly credentialRepository;
    private readonly userRepository;
    private jwtService;
    private readonly logger;
    constructor(repository: Repository<Token>, credentialRepository: Repository<Credential>, userRepository: Repository<User>, jwtService: JwtService);
    getTokens(credential: Credential): Promise<Token>;
    deleteFor(credential: Credential): Promise<void>;
    refresh(payload: RefreshTokenPayload): Promise<Token>;
}
