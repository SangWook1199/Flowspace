package com.flowspace.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowspace.entity.User;
import com.flowspace.entity.UserSocialAccount;
import com.flowspace.entity.enums.Provider;

public interface UserSocialAccountRepository extends JpaRepository<UserSocialAccount, Long> {

    Optional<UserSocialAccount> findByProviderAndProviderId(Provider provider, String providerId);

    boolean existsByUserAndProvider(User user, Provider provider);

    void deleteByUser(User user);
}
