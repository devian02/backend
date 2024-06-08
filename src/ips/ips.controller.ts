import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, UseGuards, Request } from '@nestjs/common';
import { IpsService } from './ips.service';
import { CreateIpDto } from './dto/create-ip.dto';
import { UpdateIpDto } from './dto/update-ip.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthGuard } from 'src/auth/auth.guard';
import { BlockchainService } from 'src/blockchain/blockchain.service';

@Controller('ips')
@UseGuards(AuthGuard)
export class IpsController {
  constructor(private readonly ipsService: IpsService, private blockchainService: BlockchainService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads'
      , filename: (req, file, cb) => {
        // Generating a 32 random chars long string
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('')
        //Calling the callback passing the random name generated with the original extension name
        cb(null, `${randomName}${extname(file.originalname)}`)
      }
    })
  }))
  create(
    @Request() req,
    @Body() createIpDto: CreateIpDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({maxSize: 100 * 1024 * 1024}),
        ]
      })
    )
    file: Express.Multer.File,
  ) {
    return this.ipsService.create(createIpDto, file, req.user.id);
  }

  @Get()
  findAll() {
    return this.ipsService.findAll();
  }

  @Get('bought')
  findAllBought(@Request() req) {
    return this.ipsService.findAllBoughtByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ipsService.findOne(id);
  }

  // ! Not implemented in the frontend
  @Patch(':id')
  update(@Request()req, @Param('id') id: string, @Body() updateIpDto: UpdateIpDto) {
    return this.ipsService.update(id, updateIpDto, req.user.id);
  }

  // ! Not implemented in the frontend
  @Delete(':id')
  remove(@Request()req, @Param('id') id: string) {
    return this.ipsService.remove(id, req.user.id);
  }

  // ! Not implemented in the frontend
  @Patch(':id/restore')
  restore(@Request()req, @Param('id') id: string) {
    return this.ipsService.restore(id, req.user.id);
  }

  // ! Not implemented in the frontend
  @Post(':id/buy')
  buy(@Request()req, @Param('id') id: string) {
    return this.ipsService.buy(id, req.user.id);
  }

}
