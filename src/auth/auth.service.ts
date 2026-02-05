import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) { }

  // Determina o vereadorId efetivo do usuário
  private getEffectiveVereadorId(user: any): string | null {
    // ADMIN não tem tenant (acesso total)
    if (user.role === UserRole.ADMIN) {
      return null;
    }
    // VEREADOR é seu próprio tenant
    if (user.role === UserRole.VEREADOR) {
      return user.id;
    }
    // ASSESSOR e LIDERANCA usam o vereadorId do cadastro
    return user.vereadorId;
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    console.log(`[AuthService] Login attempt for email: ${email}`);
    console.log(`[AuthService] User found: ${!!user}`);

    if (!user) {
      console.log('[AuthService] User not found');
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await this.usersService.validatePassword(user, password);
    console.log(`[AuthService] Password valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log('[AuthService] Invalid password');
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.active) {
      console.log('[AuthService] User inactive');
      throw new UnauthorizedException('Usuário inativo');
    }

    const vereadorId = this.getEffectiveVereadorId(user);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      vereadorId: vereadorId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        phone: user.phone,
        role: user.role,
        region: user.region,
        active: user.active,
        vereadorId: vereadorId,
        createdAt: user.createdAt,
      },
    };
  }

  async register(userData: any) {
    // Registro público: cria como se fosse um admin criando (sem restrições)
    const systemUser = {
      userId: 'system',
      email: 'system@governeai.com',
      role: UserRole.ADMIN,
      name: 'System',
      vereadorId: null,
    };
    const user = await this.usersService.create(userData, systemUser);

    const vereadorId = this.getEffectiveVereadorId(user);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      vereadorId: vereadorId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        phone: user.phone,
        role: user.role,
        region: user.region,
        active: user.active,
        vereadorId: vereadorId,
        createdAt: user.createdAt,
      },
    };
  }

  async validateUser(payload: any) {
    return await this.usersService.findOne(payload.sub);
  }
}
